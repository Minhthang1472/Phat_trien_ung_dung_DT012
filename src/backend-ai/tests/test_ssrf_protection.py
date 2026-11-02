import socket

import pytest
from fastapi import HTTPException

from app.services import audio_service as audio_module

PUBLIC_IP = "93.184.216.34"


def _fake_public_dns(host, port, *args, **kwargs):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (PUBLIC_IP, 0))]


def _validate(url):
    return audio_module.audio_service.validate_source_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/video.mp4",
        "http://[::1]/video.mp4",
        "http://169.254.169.254/latest/meta-data",
        "http://localhost/video.mp4",
        "http://metadata.google.internal/computeMetadata/v1/",
        "file:///etc/passwd",
    ],
)
def test_rejects_loopback_metadata_and_bad_schemes(url):
    with pytest.raises(HTTPException) as exc:
        _validate(url)
    assert exc.value.status_code == 400


def test_rejects_hostname_that_resolves_to_private_ip(monkeypatch):
    def private_dns(host, port, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 0))]

    monkeypatch.setattr(audio_module.socket, "getaddrinfo", private_dns)
    with pytest.raises(HTTPException) as exc:
        _validate("https://drive.google.com/file/d/abc/video.mp4")
    assert exc.value.status_code == 400


def test_rejects_unknown_domain_even_with_media_extension(monkeypatch):
    monkeypatch.setattr(audio_module.socket, "getaddrinfo", _fake_public_dns)
    with pytest.raises(HTTPException) as exc:
        _validate("https://evil.example.com/lecture.mp4")
    assert exc.value.status_code == 400


def test_allows_allowlisted_host_with_public_dns(monkeypatch):
    monkeypatch.setattr(audio_module.socket, "getaddrinfo", _fake_public_dns)
    url = "https://www.youtube.com/watch?v=abc123"
    assert _validate(url) == url


def test_rejects_credentials_in_url(monkeypatch):
    monkeypatch.setattr(audio_module.socket, "getaddrinfo", _fake_public_dns)
    with pytest.raises(HTTPException) as exc:
        _validate("https://user:password@www.youtube.com/watch?v=abc123")
    assert exc.value.status_code == 400
