import pytest

from app.core.config import Settings


def _production_settings() -> Settings:
    config = Settings()
    config.ENVIRONMENT = "production"
    config.JWT_SECRET = "x" * 64
    config.CORS_ORIGINS = ["https://app.example.com"]
    config.SMTP_HOST = "smtp.example.com"
    config.SMTP_USERNAME = "mailer"
    config.SMTP_PASSWORD = "secret"
    config.PUBLIC_API_URL = "https://api.example.com"
    config.ALLOWED_VIDEO_HOSTS = ["youtube.com"]
    config.METRICS_TOKEN = "m" * 32
    config.TRUSTED_PROXIES = []
    config.ALLOWED_HOSTS = ["api.example.com"]
    return config


def test_production_settings_validate_ok():
    _production_settings().validate()


def test_production_settings_require_long_jwt_secret():
    config = _production_settings()
    config.JWT_SECRET = "short"

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        config.validate()


def test_production_settings_reject_sample_jwt_secret():
    config = _production_settings()
    config.JWT_SECRET = "replace_with_a_long_random_secret_at_least_32_chars"

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        config.validate()


def test_production_settings_require_specific_cors_origin():
    config = _production_settings()
    config.CORS_ORIGINS = ["*"]

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        config.validate()


def test_production_settings_require_https_cors_origin():
    config = _production_settings()
    config.CORS_ORIGINS = ["http://app.example.com"]

    with pytest.raises(RuntimeError, match="HTTPS"):
        config.validate()


def test_production_settings_reject_trust_all_proxies():
    config = _production_settings()
    config.TRUSTED_PROXIES = ["0.0.0.0/0"]

    with pytest.raises(RuntimeError, match="TRUSTED_PROXIES"):
        config.validate()


def test_production_settings_require_smtp():
    config = _production_settings()
    config.SMTP_PASSWORD = ""

    with pytest.raises(RuntimeError, match="SMTP"):
        config.validate()


def test_production_settings_require_https_public_url():
    config = _production_settings()
    config.PUBLIC_API_URL = "http://api.example.com"

    with pytest.raises(RuntimeError, match="HTTPS"):
        config.validate()


def test_production_settings_require_strong_metrics_token():
    config = _production_settings()
    config.METRICS_TOKEN = "short"

    with pytest.raises(RuntimeError, match="METRICS_TOKEN"):
        config.validate()


def test_production_settings_require_strong_admin_token():
    config = _production_settings()
    config.ADMIN_TOKEN = "short"

    with pytest.raises(RuntimeError, match="ADMIN_TOKEN"):
        config.validate()


def test_production_settings_require_specific_allowed_hosts():
    config = _production_settings()
    config.ALLOWED_HOSTS = ["*"]

    with pytest.raises(RuntimeError, match="ALLOWED_HOSTS"):
        config.validate()


def test_production_settings_reject_invalid_trusted_proxy():
    config = _production_settings()
    config.TRUSTED_PROXIES = ["10.0.0.0/8", "khong-phai-cidr"]

    with pytest.raises(RuntimeError, match="TRUSTED_PROXIES"):
        config.validate()


def test_development_settings_skip_strict_validation():
    config = Settings()
    config.ENVIRONMENT = "development"
    config.JWT_SECRET = ""
    config.CORS_ORIGINS = ["*"]
    config.SMTP_PASSWORD = ""
    config.PUBLIC_API_URL = "http://127.0.0.1:8000"

    config.validate()
