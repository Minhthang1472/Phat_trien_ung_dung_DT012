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


def test_untrusted_host_header_is_rejected():
    response = TestClient(app).get("/health", headers={"Host": "evil.example.com"})

    assert response.status_code == 400


def test_local_healthcheck_host_is_allowed():
    response = TestClient(app).get("/health", headers={"Host": "127.0.0.1:8000"})

    assert response.status_code == 200


def test_request_id_keeps_valid_client_value():
    response = TestClient(app).get("/health", headers={"X-Request-ID": "req-123.abc"})

    assert response.headers["X-Request-ID"] == "req-123.abc"


def test_request_id_rejects_invalid_client_value():
    response = TestClient(app).get("/health", headers={"X-Request-ID": "bad id with spaces"})

    request_id = response.headers["X-Request-ID"]
    assert request_id != "bad id with spaces"
    assert len(request_id) == 12


def test_security_headers_are_present():
    response = TestClient(app).get("/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "Content-Security-Policy" in response.headers


def test_auth_responses_are_not_cached():
    response = TestClient(app).post(
        "/api/auth/login",
        json={"username": "khong-ton-tai", "password": "sai-mat-khau"},
    )

    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Pragma"] == "no-cache"


def test_metrics_requires_token_when_configured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "METRICS_TOKEN", "metrics-secret-value")

    client = TestClient(app)
    assert client.get("/metrics").status_code == 401
    authorized = client.get("/metrics", headers={"X-Metrics-Token": "metrics-secret-value"})
    assert authorized.status_code == 200
    assert "lecture_ai_http_requests_total" in authorized.text


def test_metrics_hidden_in_production_without_token(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "")

    response = TestClient(app).get("/metrics")

    assert response.status_code == 404


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


def test_api_v1_alias_keeps_version_header():
    response = TestClient(app).get("/api/v1/history")

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.headers["X-API-Version"] == "1"


def test_openapi_json_is_gzipped_when_requested():
    response = TestClient(app).get(
        "/openapi.json",
        headers={"Accept-Encoding": "gzip"},
    )

    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
