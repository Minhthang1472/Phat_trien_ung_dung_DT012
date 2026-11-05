import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import heavy_rate_limit
from app.core.job_queue import MemoryJobQueue
from app.firebase_database import firebase_service
from app.main import app
from app.routers import admin as admin_module

TOKEN = "a" * 40
HEADERS = {"X-Admin-Token": TOKEN}


@pytest.fixture
def no_heavy_rate_limit():
    app.dependency_overrides[heavy_rate_limit] = lambda: None
    try:
        yield
    finally:
        app.dependency_overrides.pop(heavy_rate_limit, None)


@pytest.fixture
def admin_env(monkeypatch, no_heavy_rate_limit):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", TOKEN)

    queue = MemoryJobQueue()
    queue.create_job(
        {
            "job_id": "job-abc",
            "title": "Bài giảng mẫu",
            "status": "processing",
            "progress": 45,
            "owner_id": "user-1",
            "created_at": time.time(),
        }
    )
    queue.enqueue("job-abc", {"audio_path": "/tmp/a.wav"})
    monkeypatch.setattr(admin_module, "job_queue", queue)

    counts = {"users": 5, "lectures": 9, "media_owners": 4}
    monkeypatch.setattr(
        firebase_service, "count_collection", lambda name: counts.get(name)
    )
    monkeypatch.setattr(firebase_service, "count_deleted_users", lambda: 1)
    monkeypatch.setattr(
        firebase_service,
        "list_deleted_users",
        lambda limit=50: [
            {
                "id": "user-9",
                "email": "deleted@example.com",
                "display_name": "Tài khoản cũ",
                "deleted_at": "2026-01-01T00:00:00+00:00",
            }
        ],
    )
    return queue


def test_admin_dashboard_static_page_and_csp(admin_env):
    client = TestClient(app)

    page = client.get("/admin")
    assert page.status_code == 200
    assert page.headers["content-type"].startswith("text/html")
    csp = page.headers["content-security-policy"]
    assert "script-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert page.headers["cache-control"] == "no-store"
    assert 'src="/admin/app.js"' in page.text

    script = client.get("/admin/app.js")
    assert script.status_code == 200
    assert "javascript" in script.headers["content-type"]
    assert "loadOverview" in script.text

    styles = client.get("/admin/styles.css")
    assert styles.status_code == 200
    assert "text/css" in styles.headers["content-type"]


def test_admin_overview_requires_token(admin_env):
    client = TestClient(app)
    assert client.get("/api/admin/overview").status_code == 401

    monkey = TestClient(app).get(
        "/api/admin/overview", headers={"X-Admin-Token": "sai-token"}
    )
    assert monkey.status_code == 401


def test_admin_overview_returns_stats_queue_and_deleted_users(admin_env):
    response = TestClient(app).get("/api/admin/overview", headers=HEADERS)
    assert response.status_code == 200
    data = response.json()

    assert data["users"] == {"total": 5, "deleted": 1}
    assert data["lectures"] == 9
    assert data["media_owners"] == 4
    assert set(data["storage"]) == {"files", "bytes"}
    assert data["queue"]["backend"] == "memory"
    assert data["queue"]["pending"] == 1
    assert data["queue"]["processing"] == 1
    assert data["queue"]["worker_alive"] is True
    assert data["deleted_users"][0]["email"] == "deleted@example.com"
    assert data["jobs"][0]["job_id"] == "job-abc"
    assert isinstance(data["generated_at"], (int, float))


def test_admin_stats_queue_and_jobs_endpoints(admin_env):
    client = TestClient(app)

    stats = client.get("/api/admin/stats", headers=HEADERS)
    assert stats.status_code == 200
    assert stats.json()["queue"]["backend"] == "memory"

    queue = client.get("/api/admin/queue", headers=HEADERS)
    assert queue.status_code == 200
    assert queue.json()["pending"] == 1

    jobs = client.get("/api/admin/jobs?limit=5", headers=HEADERS)
    assert jobs.status_code == 200
    assert jobs.json()["total"] == 1
    assert jobs.json()["items"][0]["title"] == "Bài giảng mẫu"


def test_admin_endpoints_still_hidden_without_configured_token(admin_env, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "")
    client = TestClient(app)

    assert client.get("/api/admin/overview", headers=HEADERS).status_code == 404
    assert client.get("/api/admin/queue", headers=HEADERS).status_code == 404
