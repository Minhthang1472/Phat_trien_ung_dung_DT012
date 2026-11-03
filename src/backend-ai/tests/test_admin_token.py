import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.routers.admin import require_admin_token


def test_admin_token_with_non_ascii_header_returns_401(monkeypatch):
    """Header lạ không được làm endpoint quản trị trả 500."""
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "a" * 32)

    with pytest.raises(HTTPException) as exc_info:
        require_admin_token("é")

    assert exc_info.value.status_code == 401


def test_admin_endpoint_hidden_when_token_missing(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "")

    response = TestClient(app).get("/api/admin/users")

    assert response.status_code == 404
