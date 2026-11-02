import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user, heavy_rate_limit
from app.firebase_database import firebase_service
from app.main import app

LECTURE = {
    "title": "Bài giảng API",
    "video_url": "https://youtu.be/abc123",
    "language": "vi",
    "summary": "Tóm tắt dùng cho kiểm thử endpoint export.",
    "key_points": ["Ý một", "Ý hai"],
    "sections": [{"title": "Mở đầu", "start_sec": 0, "end_sec": 30, "summary": "Nội dung"}],
    "mindmap": {"title": "Gốc", "children": [{"title": "Nhánh"}]},
    "quiz": [
        {
            "question": "Câu hỏi?",
            "options": ["A. Đúng", "B. Sai"],
            "correct_answer": "A",
            "explanation": "Vì vậy.",
        }
    ],
    "segments": [
        {
            "start": 0,
            "end": 1.5,
            "text": "Xin chào",
            "original_text": "Xin chào",
            "translated_text": "Hello",
        }
    ],
}


@pytest.fixture()
def client():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "test-user",
        "email": "test@example.com",
    }
    app.dependency_overrides[heavy_rate_limit] = lambda: None
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(heavy_rate_limit, None)


@pytest.fixture()
def lecture_cache(monkeypatch):
    monkeypatch.setattr(
        firebase_service,
        "get_lecture_cache",
        lambda video_url, owner_id=None: dict(LECTURE),
    )


@pytest.mark.parametrize("fmt,expected_prefix", [("pdf", b"%PDF"), ("docx", b"PK")])
def test_export_binary_formats(client, lecture_cache, fmt, expected_prefix):
    response = client.get(
        "/api/export",
        params={"video_url": LECTURE["video_url"], "format": fmt},
    )
    assert response.status_code == 200
    assert response.content.startswith(expected_prefix)
    assert "attachment" in response.headers["content-disposition"]


def test_export_markdown_returns_text(client, lecture_cache):
    response = client.get(
        "/api/export",
        params={"video_url": LECTURE["video_url"], "format": "md"},
    )
    assert response.status_code == 200
    assert response.text.startswith("# Bài giảng API")
    assert response.headers["content-type"].startswith("text/markdown")


def test_export_accepts_markdown_alias(client, lecture_cache):
    response = client.get(
        "/api/export",
        params={"video_url": LECTURE["video_url"], "format": "markdown"},
    )
    assert response.status_code == 200
    assert response.text.startswith("# Bài giảng API")


def test_export_rejects_unknown_format(client, lecture_cache):
    response = client.get(
        "/api/export",
        params={"video_url": LECTURE["video_url"], "format": "exe"},
    )
    assert response.status_code == 400
    assert "pdf" in response.json()["detail"]


def test_export_missing_cache_returns_404(client, monkeypatch):
    monkeypatch.setattr(
        firebase_service,
        "get_lecture_cache",
        lambda video_url, owner_id=None: None,
    )
    response = client.get(
        "/api/export",
        params={"video_url": "https://youtu.be/khong-ton-tai", "format": "pdf"},
    )
    assert response.status_code == 404


def test_export_rejects_blank_video_url(client, lecture_cache):
    response = client.get("/api/export", params={"video_url": "   ", "format": "pdf"})
    assert response.status_code == 400


def test_export_filename_is_encoded(client, lecture_cache):
    response = client.get(
        "/api/export",
        params={"video_url": LECTURE["video_url"], "format": "pdf"},
    )
    assert "filename*=UTF-8''" in response.headers["content-disposition"]
    assert ".pdf" in response.headers["content-disposition"]
