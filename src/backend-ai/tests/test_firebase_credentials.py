import os

from app import firebase_database


def test_init_firebase_honors_configured_credentials_path(monkeypatch):
    """Docker mount key tại /app/secrets; biến môi trường phải được ưu tiên."""
    checked = []
    monkeypatch.setenv(
        "FIREBASE_CREDENTIALS_PATH", "/app/secrets/serviceAccountKey.json"
    )
    monkeypatch.setattr(
        firebase_database.os.path,
        "exists",
        lambda path: checked.append(path) or False,
    )

    service = firebase_database.FirebaseService()
    service.init_firebase()

    assert "/app/secrets/serviceAccountKey.json" in checked


def test_init_firebase_resolves_relative_credentials_path(monkeypatch):
    checked = []
    monkeypatch.setenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    monkeypatch.setattr(
        firebase_database.os.path,
        "exists",
        lambda path: checked.append(path) or False,
    )

    service = firebase_database.FirebaseService()
    service.init_firebase()

    assert any(path.endswith(os.path.join("backend-ai", "serviceAccountKey.json")) for path in checked)
