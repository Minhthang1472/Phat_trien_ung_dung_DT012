"""Kiểm thử xác thực và giới hạn của WebSocket Live-Caption."""

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api import websocket_router
from app.firebase_database import firebase_service
from app.main import app
from app.services.auth_service import auth_service


class FakeRef:
    def __init__(self, store, doc_id):
        self._store = store
        self.id = doc_id

    @property
    def exists(self):
        return self.id in self._store

    def get(self):
        return self

    def to_dict(self):
        return dict(self._store.get(self.id) or {})


class FakeCollection:
    def __init__(self, store):
        self._store = store

    def document(self, doc_id):
        return FakeRef(self._store, doc_id)


class FakeDB:
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        return FakeCollection(self.collections.setdefault(name, {}))


USER = {
    "id": "user-1",
    "email": "hocvien@example.com",
    "token_version": 2,
}


@pytest.fixture()
def db(monkeypatch):
    fake = FakeDB()
    fake.collection("users").document("user-1")._store["user-1"] = dict(USER)
    monkeypatch.setattr(firebase_service, "db", fake)
    return fake


def _ws_url(token=None):
    if token is None:
        return "/api/live/stream"
    return f"/api/live/stream?token={token}"


def _expect_rejected(token, code):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with TestClient(app).websocket_connect(_ws_url(token)):
            pass
    assert exc_info.value.code == code


def test_missing_token_is_rejected():
    _expect_rejected(None, 1008)


def test_access_token_cannot_open_websocket(db):
    """Access token thường không được dùng cho luồng live."""
    _expect_rejected(auth_service.create_token(USER), 1008)


def test_revoked_token_version_is_rejected(db):
    token = auth_service.create_ws_token(USER)
    db.collection("users").document("user-1")._store["user-1"]["token_version"] = 3

    _expect_rejected(token, 1008)


def test_deleted_user_is_rejected(db):
    token = auth_service.create_ws_token(USER)
    db.collection("users").document("user-1")._store["user-1"]["deleted"] = True

    _expect_rejected(token, 1008)


def test_valid_token_accepts_and_answers_ping(db):
    token = auth_service.create_ws_token(USER)

    with TestClient(app).websocket_connect(_ws_url(token)) as websocket:
        hello = websocket.receive_json()
        assert hello["type"] == "status"

        websocket.send_json({"action": "ping"})
        assert websocket.receive_json() == {"type": "pong"}

        websocket.send_json({"action": "stop"})
        assert websocket.receive_json()["type"] == "status"


def test_oversized_audio_buffer_is_closed(db, monkeypatch):
    """Client gửi quá nhiều audio phải bị đóng với mã 1009, không giữ RAM."""
    token = auth_service.create_ws_token(USER)
    monkeypatch.setattr(websocket_router, "MAX_BUFFER_BYTES", 1024)

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with TestClient(app).websocket_connect(_ws_url(token)) as websocket:
            websocket.receive_json()  # status
            websocket.send_bytes(b"\x00" * 4096)
            websocket.receive_json()

    assert exc_info.value.code == 1009


def test_connection_limit_returns_1013(db, monkeypatch):
    token = auth_service.create_ws_token(USER)
    monkeypatch.setattr(websocket_router, "MAX_CONNECTIONS", 0)

    _expect_rejected(token, 1013)
