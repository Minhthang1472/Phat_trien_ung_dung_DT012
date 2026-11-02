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
