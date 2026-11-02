import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user, heavy_rate_limit
from app.main import app
from app.routers import video as video_router
from app.services.auth_service import auth_service


@pytest.fixture()
def client():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-1",
        "email": "user1@example.com",
    }
    app.dependency_overrides[heavy_rate_limit] = lambda: None
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(heavy_rate_limit, None)


@pytest.fixture()
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(video_router, "UPLOAD_DIR", str(tmp_path))
    return tmp_path


def test_media_token_returns_short_lived_token(client, upload_dir, monkeypatch):
    (upload_dir / "clip.mp4").write_bytes(b"fake-video")
    monkeypatch.setattr(video_router, "_ensure_media_owner", lambda user_id, media_url: None)

    response = client.post(
        "/api/media/token",
        json={"media_url": "https://api.example.com/uploads/clip.mp4?old_token=1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["media_url"] == "/uploads/clip.mp4"
    assert payload["expires_in"] > 0

    claims = auth_service.decode_media_token(payload["token"])
    assert claims["sub"] == "user-1"
    assert claims["media_url"] == "/uploads/clip.mp4"


def test_media_token_rejects_non_owner(client, upload_dir, monkeypatch):
    (upload_dir / "private.mp4").write_bytes(b"fake-video")

    def deny(user_id, media_url):
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập file này.")

    monkeypatch.setattr(video_router, "_ensure_media_owner", deny)

    response = client.post("/api/media/token", json={"media_url": "/uploads/private.mp4"})
    assert response.status_code == 403


def test_media_token_missing_file_returns_404(client, upload_dir):
    response = client.post("/api/media/token", json={"media_url": "/uploads/khong-ton-tai.mp4"})
    assert response.status_code == 404


def test_media_token_rejects_path_traversal(client, upload_dir):
    response = client.post("/api/media/token", json={"media_url": "/uploads/../secret.mp4"})
    assert response.status_code == 400


def test_subtitle_upload_is_rejected_before_reading_unbounded(client, monkeypatch):
    monkeypatch.setattr(video_router, "MAX_SUBTITLE_UPLOAD_SIZE", 128)

    response = client.post(
        "/api/subtitles/process",
        files={"file": ("subtitles.srt", b"x" * 512, "text/plain")},
    )

    assert response.status_code == 413


def test_media_upload_is_rejected_without_leaving_partial_file(client, upload_dir, monkeypatch):
    monkeypatch.setattr(video_router, "MAX_MEDIA_UPLOAD_SIZE", 1024)

    response = client.post(
        "/api/video/upload",
        files={"file": ("lecture.mp4", b"x" * 4096, "video/mp4")},
    )

    assert response.status_code == 413
    assert list(upload_dir.iterdir()) == []
