import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import auth_rate_limit, get_current_user, get_optional_user, heavy_rate_limit
from app.firebase_database import firebase_service
from app.main import app
from app.services.auth_service import auth_service
from app.services.email_service import email_service

USER = {
    "id": "user-1",
    "username": "hocvien",
    "email": "hocvien@example.com",
    "display_name": "Học viên",
    "password_hash": auth_service.hash_password("secret123"),
}


class FakeRef:
    def __init__(self, store, doc_id):
        self._store = store
        self.id = doc_id
        self.reference = self

    @property
    def exists(self):
        return self.id in self._store

    def get(self):
        return self

    def to_dict(self):
        return dict(self._store.get(self.id) or {})

    def set(self, payload, merge=False):
        if merge and self.id in self._store:
            merged = dict(self._store[self.id])
            merged.update(payload)
            self._store[self.id] = merged
        else:
            self._store[self.id] = dict(payload)

    def update(self, payload):
        merged = dict(self._store.get(self.id) or {})
        merged.update(payload)
        self._store[self.id] = merged

    def delete(self):
        self._store.pop(self.id, None)


class FakeQuery:
    def __init__(self, store):
        self._store = store
        self._field = None
        self._value = None
        self._limit = None

    def where(self, *args, **kwargs):
        if len(args) >= 3 and args[1] == "==":
            self._field = args[0]
            self._value = args[2]
        return self

    def limit(self, count):
        self._limit = count
        return self

    def stream(self):
        refs = [
            FakeRef(self._store, doc_id)
            for doc_id, data in self._store.items()
            if self._field is None or data.get(self._field) == self._value
        ]
        return iter(refs[: self._limit] if self._limit else refs)


class FakeCollection:
    def __init__(self, store):
        self._store = store

    def document(self, doc_id):
        return FakeRef(self._store, doc_id)

    def where(self, *args, **kwargs):
        return FakeQuery(self._store).where(*args, **kwargs)


class FakeBatch:
    def __init__(self):
        self._pending = []

    def delete(self, ref):
        self._pending.append(ref)

    def commit(self):
        for ref in self._pending:
            ref.delete()
        self._pending.clear()


class FakeDB:
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        return FakeCollection(self.collections.setdefault(name, {}))

    def batch(self):
        return FakeBatch()


def _seed(db):
    db.collection("users").document("user-1").set(USER)
    db.collection("users").document("user-2").set({"id": "user-2", "email": "other@example.com"})

    lectures = db.collection("lectures")
    lectures.document("lecture-1").set({
        "owner_id": "user-1",
        "video_url": "https://youtu.be/abc",
        "title": "Bài của tôi",
        "media_url": "/uploads/a.mp4",
    })
    lectures.document("lecture-2").set({
        "owner_id": "user-2",
        "video_url": "https://youtu.be/xyz",
        "title": "Bài người khác",
        "media_url": "/uploads/b.mp4",
    })

    media = db.collection("media_owners")
    media.document("m-1").set({"owner_id": "user-1", "media_url": "/uploads/a.mp4"})
    media.document("m-2").set({"owner_id": "user-2", "media_url": "/uploads/b.mp4"})


@pytest.fixture()
def no_auth_rate_limit():
    app.dependency_overrides[auth_rate_limit] = lambda: None
    try:
        yield
    finally:
        app.dependency_overrides.pop(auth_rate_limit, None)


@pytest.fixture()
def no_heavy_rate_limit():
    app.dependency_overrides[heavy_rate_limit] = lambda: None
    try:
        yield
    finally:
        app.dependency_overrides.pop(heavy_rate_limit, None)


@pytest.fixture
def account_client(monkeypatch, tmp_path):
    db = FakeDB()
    _seed(db)
    monkeypatch.setattr(firebase_service, "db", db)
    app.dependency_overrides[get_current_user] = lambda: dict(USER)
    try:
        yield TestClient(app), db, tmp_path
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_export_data_returns_owner_documents_without_password(account_client):
    client, _db, _tmp = account_client

    response = client.get("/api/auth/export-data")

    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    payload = json.loads(response.text)
    assert payload["user"]["id"] == "user-1"
    assert len(payload["lectures"]) == 1
    assert payload["lectures"][0]["title"] == "Bài của tôi"
    assert len(payload["media_owners"]) == 1
    assert payload["user"]["has_password"] is True
    assert "password_hash" not in payload["user"]


def test_delete_account_rejects_wrong_password(account_client):
    client, db, _tmp = account_client

    response = client.request(
        "DELETE", "/api/auth/account", json={"password": "sai-mat-khau"}
    )

    assert response.status_code == 400
    assert db.collection("users").document("user-1").exists
    assert db.collection("lectures").document("lecture-1").exists


def test_delete_account_soft_deletes_and_keeps_all_data(account_client):
    client, db, tmp_path = account_client
    upload = tmp_path / "a.mp4"
    upload.write_bytes(b"video")

    response = client.request(
        "DELETE", "/api/auth/account", json={"password": "secret123"}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["deleted"] is True
    assert payload["soft"] is True
    assert payload["retained"] == {"lectures": 1, "media_owners": 1}
    assert payload["deleted_at"]

    # Xoá mềm: tài liệu người dùng vẫn còn, chỉ được đánh dấu vô hiệu hoá.
    user_doc = db.collection("users").document("user-1")
    assert user_doc.exists
    user_data = user_doc.to_dict()
    assert user_data["deleted"] is True
    assert user_data["account_status"] == "deleted"
    assert user_data["deleted_at"]

    # Bài giảng, quyền media và file upload đều được giữ nguyên.
    assert upload.exists()
    assert db.collection("lectures").document("lecture-1").exists
    assert db.collection("media_owners").document("m-1").exists
    assert db.collection("users").document("user-2").exists


def test_soft_deleted_account_cannot_log_in(monkeypatch):
    db = FakeDB()
    _seed(db)
    db.collection("users").document("user-1").update(
        {"deleted": True, "account_status": "deleted"}
    )
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/login",
        json={"email": "hocvien", "password": "secret123"},
    )

    assert response.status_code == 403
    assert "vô hiệu hoá" in response.json()["detail"]


def test_soft_deleted_account_token_is_rejected(monkeypatch):
    db = FakeDB()
    _seed(db)
    db.collection("users").document("user-1").update(
        {"deleted": True, "account_status": "deleted"}
    )
    monkeypatch.setattr(firebase_service, "db", db)
    token = auth_service.create_token(USER)

    response = TestClient(app).get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "vô hiệu hoá" in response.json()["detail"]


def test_google_account_can_delete_without_password(monkeypatch):
    google_user = {
        "id": "google_123",
        "email": "google@example.com",
        "display_name": "Google User",
        "auth_provider": "google",
    }
    db = FakeDB()
    db.collection("users").document("google_123").set(google_user)
    monkeypatch.setattr(firebase_service, "db", db)
    app.dependency_overrides[get_current_user] = lambda: dict(google_user)
    try:
        response = TestClient(app).request("DELETE", "/api/auth/account", json={})
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert db.collection("users").document("google_123").exists
    assert db.collection("users").document("google_123").to_dict()["deleted"] is True


def test_soft_deleted_account_media_token_is_rejected(monkeypatch, tmp_path):
    db = FakeDB()
    _seed(db)
    db.collection("users").document("user-1").update(
        {"deleted": True, "account_status": "deleted"}
    )
    monkeypatch.setattr(firebase_service, "db", db)

    from app.routers import video as video_module

    monkeypatch.setattr(video_module, "UPLOAD_DIR", str(tmp_path))
    (tmp_path / "a.mp4").write_bytes(b"video")
    token = auth_service.create_media_token("user-1", "/uploads/a.mp4")

    response = TestClient(app).get(f"/uploads/a.mp4?access_token={token}")

    assert response.status_code == 403
    assert "vô hiệu hoá" in response.json()["detail"]


def test_media_token_rejected_after_token_version_bump(monkeypatch, tmp_path):
    db = FakeDB()
    _seed(db)
    db.collection("users").document("user-1").update({"token_version": 1})
    monkeypatch.setattr(firebase_service, "db", db)

    from app.routers import video as video_module

    monkeypatch.setattr(video_module, "UPLOAD_DIR", str(tmp_path))
    (tmp_path / "a.mp4").write_bytes(b"video")
    token = auth_service.create_media_token("user-1", "/uploads/a.mp4", 0)

    response = TestClient(app).get(f"/uploads/a.mp4?access_token={token}")

    assert response.status_code == 403
    assert "thu hồi" in response.json()["detail"]


def test_history_pagination_returns_next_offset(monkeypatch):
    db = FakeDB()
    _seed(db)
    lectures = db.collection("lectures")
    lectures.document("lecture-1").set({
        "owner_id": "user-1",
        "video_url": "https://youtu.be/abc",
        "title": "Bài mới nhất",
        "cached_at": "2026-01-03T00:00:00",
    })
    lectures.document("lecture-3").set({
        "owner_id": "user-1",
        "video_url": "https://youtu.be/def",
        "title": "Bài cũ hơn",
        "cached_at": "2026-01-02T00:00:00",
    })
    monkeypatch.setattr(firebase_service, "db", db)
    app.dependency_overrides[get_optional_user] = lambda: dict(USER)
    try:
        client = TestClient(app)
        first = client.get("/api/history?limit=1&offset=0")
        second = client.get("/api/history?limit=1&offset=1")
    finally:
        app.dependency_overrides.pop(get_optional_user, None)

    assert first.status_code == 200
    first_payload = first.json()
    assert [item["title"] for item in first_payload["items"]] == ["Bài mới nhất"]
    assert first_payload["has_more"] is True
    assert first_payload["next_offset"] == 1

    assert second.status_code == 200
    second_payload = second.json()
    assert [item["title"] for item in second_payload["items"]] == ["Bài cũ hơn"]
    assert second_payload["has_more"] is False
    assert second_payload["next_offset"] is None


def test_register_fails_closed_in_production_without_smtp(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(email_service, "configured", lambda: False)

    response = TestClient(app).post(
        "/api/auth/register",
        json={"email": "new-user@example.com", "password": "secret123"},
    )

    assert response.status_code == 503
    user_id = hashlib.sha256(b"new-user@example.com").hexdigest()
    assert not db.collection("users").document(user_id).exists


def test_register_rolls_back_in_production_when_email_send_fails(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(email_service, "configured", lambda: True)

    def fail_send(*_args, **_kwargs):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(email_service, "send", fail_send)

    response = TestClient(app).post(
        "/api/auth/register",
        json={"email": "mail-fail@example.com", "password": "secret123"},
    )

    assert response.status_code == 503
    user_id = hashlib.sha256(b"mail-fail@example.com").hexdigest()
    assert not db.collection("users").document(user_id).exists


def test_register_still_auto_verifies_in_development_without_smtp(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(email_service, "configured", lambda: False)

    response = TestClient(app).post(
        "/api/auth/register",
        json={"email": "dev-user@example.com", "password": "secret123"},
    )

    assert response.status_code == 200
    assert response.json()["requires_verification"] is False
    assert response.json()["token"]


def test_verify_otp_hashes_and_blocks_after_too_many_attempts(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    email = "hocvien@example.com"
    user_id = hashlib.sha256(email.encode()).hexdigest()
    db.collection("users").document(user_id).set({
        **USER,
        "id": user_id,
        "email": email,
        "email_verified": False,
        "verification_otp": None,
        "verification_otp_hash": auth_service.hash_otp("123456", "register"),
        "verification_expires_at": "2099-01-01T00:00:00+00:00",
        "verification_otp_attempts": settings.OTP_MAX_ATTEMPTS - 1,
    })
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/verify-otp",
        json={"email": email, "otp": "000000"},
    )

    assert response.status_code == 400
    assert "không hợp lệ" in response.json()["detail"]
    user_data = db.collection("users").document(user_id).to_dict()
    assert user_data["verification_otp_hash"] is None
    assert user_data["verification_otp_attempts"] == settings.OTP_MAX_ATTEMPTS


def test_verify_otp_never_issues_session_for_verified_account(monkeypatch, no_auth_rate_limit):
    """Tài khoản đã xác minh phải đăng nhập, không được cấp token qua OTP."""
    db = FakeDB()
    _seed(db)
    email = "hocvien@example.com"
    user_id = hashlib.sha256(email.encode()).hexdigest()
    db.collection("users").document(user_id).set({
        **USER,
        "id": user_id,
        "email": email,
        "email_verified": True,
    })
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/verify-otp",
        json={"email": email, "otp": "000000"},
    )

    assert response.status_code == 400
    assert "token" not in response.json()
    assert "refresh_token" not in response.json()


def test_verify_otp_accepts_hashed_code_and_clears_it(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    email = "hocvien@example.com"
    user_id = hashlib.sha256(email.encode()).hexdigest()
    db.collection("users").document(user_id).set({
        **USER,
        "id": user_id,
        "email": email,
        "email_verified": False,
        "verification_otp": None,
        "verification_otp_hash": auth_service.hash_otp("123456", "register"),
        "verification_expires_at": "2099-01-01T00:00:00+00:00",
        "verification_otp_attempts": 0,
    })
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/verify-otp",
        json={"email": email, "otp": "123456"},
    )

    assert response.status_code == 200
    user_data = db.collection("users").document(user_id).to_dict()
    assert user_data["email_verified"] is True
    assert user_data["verification_otp_hash"] is None
    assert "123456" not in json.dumps(user_data)


def test_login_returns_access_and_refresh_tokens(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    email = "hocvien@example.com"
    user_id = hashlib.sha256(email.encode()).hexdigest()
    db.collection("users").document(user_id).set({**USER, "id": user_id, "email": email})
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(email_service, "configured", lambda: False)

    response = TestClient(app).post(
        "/api/auth/login",
        json={"email": email, "password": "secret123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"]
    assert payload["refresh_token"]
    assert payload["expires_in"] > 0
    sessions = db.collection("users").document(user_id).to_dict()["refresh_sessions"]
    assert len(sessions) == 1
    assert sessions[0]["hash"] == auth_service.token_hash(payload["refresh_token"])


def test_extension_session_returns_refresh_token(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/extension-session",
        json={"device_id": "device_1234567890_abcdef"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"]
    assert payload["refresh_token"]
    user_id = payload["user"]["id"]
    sessions = db.collection("users").document(user_id).to_dict()["refresh_sessions"]
    assert len(sessions) == 1


def test_refresh_rotates_and_revokes_old_token(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    session_id = auth_service.new_session_id()
    refresh_token = auth_service.create_refresh_token(USER, session_id)
    db.collection("users").document("user-1").update({
        "refresh_sessions": [auth_service.build_refresh_session(refresh_token, session_id)],
    })
    monkeypatch.setattr(firebase_service, "db", db)

    client = TestClient(app)
    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"]
    assert payload["refresh_token"] != refresh_token

    stored = db.collection("users").document("user-1").to_dict()["refresh_sessions"]
    assert stored[0]["hash"] == auth_service.token_hash(payload["refresh_token"])

    reused = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401


def test_token_version_revokes_access_and_refresh(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    access_token = auth_service.create_token(USER)
    session_id = auth_service.new_session_id()
    refresh_token = auth_service.create_refresh_token(USER, session_id)
    db.collection("users").document("user-1").update({
        "token_version": 1,
        "refresh_sessions": [auth_service.build_refresh_session(refresh_token, session_id)],
    })
    monkeypatch.setattr(firebase_service, "db", db)

    client = TestClient(app)
    access_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    refresh_response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

    assert access_response.status_code == 401
    assert refresh_response.status_code == 401


def test_logout_removes_refresh_session(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    session_id = auth_service.new_session_id()
    refresh_token = auth_service.create_refresh_token(USER, session_id)
    db.collection("users").document("user-1").update({
        "refresh_sessions": [auth_service.build_refresh_session(refresh_token, session_id)],
    })
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/logout",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    assert db.collection("users").document("user-1").to_dict()["refresh_sessions"] == []


def test_forgot_password_fails_closed_in_production_without_smtp(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    _seed(db)
    email = "hocvien@example.com"
    user_id = hashlib.sha256(email.encode()).hexdigest()
    db.collection("users").document(user_id).set({**USER, "id": user_id, "email": email})
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(email_service, "configured", lambda: False)

    response = TestClient(app).post(
        "/api/auth/forgot-password",
        json={"email": email},
    )

    assert response.status_code == 503
    user_data = db.collection("users").document(user_id).to_dict()
    assert not user_data.get("reset_otp_hash")
    assert not user_data.get("reset_otp")


def test_login_rejects_oversized_password(no_auth_rate_limit):
    response = TestClient(app).post(
        "/api/auth/login",
        json={"email": "hocvien@example.com", "password": "x" * 129},
    )

    assert response.status_code == 422


def test_login_uses_dummy_hash_for_unknown_user(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)
    seen_hashes = []

    def fake_verify(_password, stored_hash):
        seen_hashes.append(stored_hash)
        return False

    monkeypatch.setattr(auth_service, "verify_password", fake_verify)

    response = TestClient(app).post(
        "/api/auth/login",
        json={"email": "khong-ton-tai@example.com", "password": "secret123"},
    )

    assert response.status_code == 401
    assert seen_hashes == [auth_service.DUMMY_PASSWORD_HASH]


def test_forgot_password_unknown_email_is_generic(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/forgot-password",
        json={"email": "khong-ton-tai@example.com"},
    )

    assert response.status_code == 200
    assert "Nếu email đã được đăng ký" in response.json()["message"]


def test_resend_otp_unknown_email_is_generic(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/resend-otp",
        json={"email": "khong-ton-tai@example.com"},
    )

    assert response.status_code == 200
    assert "Nếu email cần xác minh" in response.json()["message"]


def test_verify_otp_unknown_email_does_not_reveal_account(monkeypatch, no_auth_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)

    response = TestClient(app).post(
        "/api/auth/verify-otp",
        json={"email": "khong-ton-tai@example.com", "otp": "123456"},
    )

    assert response.status_code == 400
    assert "không hợp lệ" in response.json()["detail"]


def test_ws_token_hides_internal_error_details(monkeypatch, no_auth_rate_limit):
    app.dependency_overrides[get_current_user] = lambda: dict(USER)

    def broken_token(_user):
        raise RuntimeError("internal path /secret/serviceAccountKey.json")

    monkeypatch.setattr(auth_service, "create_ws_token", broken_token)
    try:
        response = TestClient(app).post("/api/auth/ws-token")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 500
    assert "serviceAccountKey" not in response.text
    assert "internal path" not in response.text


def test_admin_api_hidden_when_token_not_configured(monkeypatch, no_heavy_rate_limit):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "")

    response = TestClient(app).get("/api/admin/users")

    assert response.status_code == 404


def test_admin_api_requires_valid_token(monkeypatch, no_heavy_rate_limit):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "a" * 32)

    response = TestClient(app).get(
        "/api/admin/users",
        headers={"X-Admin-Token": "sai-token"},
    )

    assert response.status_code == 401


def test_admin_lists_and_restores_soft_deleted_user(monkeypatch, no_heavy_rate_limit):
    db = FakeDB()
    _seed(db)
    monkeypatch.setattr(firebase_service, "db", db)
    assert firebase_service.soft_delete_user_data("user-1")["deleted"] is True
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "a" * 32)
    headers = {"X-Admin-Token": "a" * 32}
    client = TestClient(app)

    listing = client.get("/api/admin/users", headers=headers)
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()["items"]] == ["user-1"]

    restored = client.post("/api/admin/users/user-1/restore", headers=headers)
    assert restored.status_code == 200
    assert restored.json()["restored"] is True

    user_data = db.collection("users").document("user-1").to_dict()
    assert user_data["deleted"] is False
    assert user_data["deleted_at"] is None
    assert user_data["account_status"] == "active"
    assert user_data["token_version"] == 1


def test_admin_restore_unknown_user_returns_404(monkeypatch, no_heavy_rate_limit):
    db = FakeDB()
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "a" * 32)

    response = TestClient(app).post(
        "/api/admin/users/khong-ton-tai/restore",
        headers={"X-Admin-Token": "a" * 32},
    )

    assert response.status_code == 404


def test_admin_restore_rejects_active_user(monkeypatch, no_heavy_rate_limit):
    db = FakeDB()
    _seed(db)
    monkeypatch.setattr(firebase_service, "db", db)
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "a" * 32)

    response = TestClient(app).post(
        "/api/admin/users/user-1/restore",
        headers={"X-Admin-Token": "a" * 32},
    )

    assert response.status_code == 409
