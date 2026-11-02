from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "firebase" in body
    assert response.headers.get("X-Request-ID")


def test_root_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_metrics_endpoint_is_prometheus_text():
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "lecture_ai_http_requests_total" in response.text


def test_export_requires_auth():
    client = TestClient(app)
    response = client.get("/api/export", params={"video_url": "https://youtu.be/x"})
    assert response.status_code == 401


def test_readiness_is_503_when_dependencies_missing(monkeypatch):
    from app.firebase_database import firebase_service

    monkeypatch.setattr(firebase_service, "db", None)
    monkeypatch.setattr("app.main.os.access", lambda *args: True)

    response = TestClient(app).get("/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["firebase"] is False


def test_readiness_is_200_when_dependencies_ready(monkeypatch):
    from app.firebase_database import firebase_service

    monkeypatch.setattr(firebase_service, "db", object())
    monkeypatch.setattr("app.main.os.access", lambda *args: True)

    response = TestClient(app).get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert all(body["checks"].values())
