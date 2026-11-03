import asyncio

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import dependencies
from app.core.config import settings


def _make_request(peer: str, forwarded: str | None = None) -> Request:
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode("latin-1")))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": headers,
        "client": (peer, 12345),
        "query_string": b"",
        "server": ("testserver", 80),
        "scheme": "http",
    }
    return Request(scope)


def test_direct_peer_is_used_when_no_trusted_proxy(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", [])

    request = _make_request("203.0.113.9", "198.51.100.7")

    assert dependencies.client_ip_from_request(request) == "203.0.113.9"


def test_forwarded_header_ignored_for_untrusted_peer(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.0.0.0/8"])

    request = _make_request("203.0.113.9", "198.51.100.7")

    assert dependencies.client_ip_from_request(request) == "203.0.113.9"


def test_trusted_proxy_uses_rightmost_untrusted_client(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.0.0.0/8", "192.168.0.0/16"])

    request = _make_request("10.1.2.3", "1.1.1.1, 198.51.100.7, 192.168.5.5")

    # 1.1.1.1 do client tự khai báo nên bị bỏ qua; 198.51.100.7 là client thật.
    assert dependencies.client_ip_from_request(request) == "198.51.100.7"


def test_trusted_proxy_handles_ipv4_port_and_ipv6(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.0.0.0/8"])

    assert dependencies.client_ip_from_request(
        _make_request("10.1.2.3", "198.51.100.7:44321")
    ) == "198.51.100.7"
    assert dependencies.client_ip_from_request(
        _make_request("10.1.2.3", "[2001:db8::1]:443")
    ) == "2001:db8::1"


def test_trusted_proxy_without_header_falls_back_to_peer(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.0.0.0/8"])

    request = _make_request("10.1.2.3")

    assert dependencies.client_ip_from_request(request) == "10.1.2.3"


def test_invalid_forwarded_entries_are_skipped(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.0.0.0/8"])

    request = _make_request("10.1.2.3", "rac, 198.51.100.7")

    assert dependencies.client_ip_from_request(request) == "198.51.100.7"


def test_rate_limit_returns_retry_after(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", [])
    monkeypatch.setattr(settings, "REDIS_URL", "")
    dependency = dependencies.rate_limit("test-retry-after", 1, 42)
    request = _make_request("203.0.113.9")

    asyncio.run(dependency(request))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dependency(request))

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers["Retry-After"] == "42"
