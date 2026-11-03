import json

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user, get_optional_user
from app.firebase_database import firebase_service
from app.main import app
from app.services.auth_service import auth_service

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
