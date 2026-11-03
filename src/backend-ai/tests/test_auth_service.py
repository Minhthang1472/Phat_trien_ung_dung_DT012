import pytest
from fastapi import HTTPException

from app.services.auth_service import auth_service


def test_hash_password_roundtrip():
    stored = auth_service.hash_password("mat-khau-rat-dai")
    assert stored.startswith("pbkdf2_sha256$240000$")
    assert auth_service.verify_password("mat-khau-rat-dai", stored)
    assert not auth_service.verify_password("sai-mat-khau", stored)


def test_hash_password_rejects_short_password():
    with pytest.raises(HTTPException):
        auth_service.hash_password("123")


def test_verify_password_handles_malformed_hash():
    assert auth_service.verify_password("abc", "not-a-valid-hash") is False
    assert auth_service.verify_password("abc", "") is False


def test_create_and_decode_token():
    user = {"id": "user-1", "email": "student@example.com"}
    token = auth_service.create_token(user)
    claims = auth_service.decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["email"] == "student@example.com"
    assert claims["type"] == "access"
    assert claims["ver"] == 0


def test_access_token_rejects_refresh_and_media_tokens():
    refresh = auth_service.create_refresh_token(
        {"id": "user-1", "email": "a@b.com"}, "session-1"
    )
    media = auth_service.create_media_token("user-1", "/uploads/a.mp4")

    with pytest.raises(HTTPException):
        auth_service.decode_access_token(refresh)
    with pytest.raises(HTTPException):
        auth_service.decode_access_token(media)
    assert auth_service.decode_refresh_token(refresh)["sid"] == "session-1"


def test_refresh_session_pruning_drops_expired_and_caps_length():
    sessions = [
        {"id": "old", "hash": "x", "expires_at": "2020-01-01T00:00:00+00:00"},
        {"id": "broken", "hash": ""},
    ] + [
        {"id": f"s{i}", "hash": "x", "expires_at": "2099-01-01T00:00:00+00:00"}
        for i in range(10)
    ]

    pruned = auth_service.prune_refresh_sessions(sessions)

    assert len(pruned) == 5
    assert [item["id"] for item in pruned] == ["s5", "s6", "s7", "s8", "s9"]


def test_ws_token_is_short_lived_type():
    token = auth_service.create_ws_token({"id": "user-1", "email": "a@b.com"})
    claims = auth_service.decode_token(token)
    assert claims["type"] == "ws"
    assert claims["sub"] == "user-1"


def test_media_token_roundtrip():
    token = auth_service.create_media_token("user-1", "/uploads/a.mp4")
    claims = auth_service.decode_media_token(token)
    assert claims["media_url"] == "/uploads/a.mp4"
    assert claims["type"] == "media"


def test_media_token_rejects_regular_token():
    token = auth_service.create_token({"id": "user-1", "email": "a@b.com"})
    with pytest.raises(HTTPException):
        auth_service.decode_media_token(token)


def test_validate_gmail():
    assert auth_service.validate_gmail("  Student@Example.COM ") == "student@example.com"
    with pytest.raises(HTTPException):
        auth_service.validate_gmail("khong-phai-email")


def test_hash_otp_is_never_plaintext_and_is_purpose_bound():
    stored = auth_service.hash_otp("123456", "register")

    assert stored.startswith("hmac_sha256$")
    assert "123456" not in stored
    assert auth_service.verify_otp("123456", stored, "register") is True
    assert auth_service.verify_otp("123456", stored, "reset_password") is False
    assert auth_service.verify_otp("654321", stored, "register") is False


def test_verify_otp_supports_legacy_plaintext_during_migration():
    assert auth_service.verify_otp("123456", "123456", "register") is True
    assert auth_service.verify_otp("000000", "123456", "register") is False
    assert auth_service.verify_otp("123456", "", "register") is False
