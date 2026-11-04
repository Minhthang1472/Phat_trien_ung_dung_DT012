import threading

import pytest

from app.services import translation_service as ts_module
from app.services.translation_service import (
    CONTEXT_BLOCK_CHARS,
    CONTEXT_BLOCK_LINES,
    TranslationService,
)


class FakeResponse:
    def __init__(self, payload=None, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def _google_payload(lines, prefix="vi:"):
    """Mô phỏng phản hồi Google Translate giữ nguyên số dòng."""
    parts = []
    for index, line in enumerate(lines):
        # Google trả các chunk nối tiếp nhau; xuống dòng nằm trong chunk.
        suffix = "\n" if index < len(lines) - 1 else ""
        parts.append([prefix + line + suffix, line, None, None])
    return [parts]


@pytest.fixture(autouse=True)
def _clean_cache():
    with ts_module._MEM_CACHE_LOCK:
        ts_module._TRANSLATION_MEM_CACHE.clear()
    yield
    with ts_module._MEM_CACHE_LOCK:
        ts_module._TRANSLATION_MEM_CACHE.clear()


@pytest.fixture(scope="module")
def service():
    return TranslationService()


def test_build_blocks_covers_all_indices_and_limits_lines():
    texts = [f"dòng {index}" for index in range(CONTEXT_BLOCK_LINES * 2 + 3)]
    blocks = TranslationService._build_blocks(texts)

    assert sum(len(block) for block in blocks) == len(texts)
    assert [idx for block in blocks for idx in block] == list(range(len(texts)))
    assert all(len(block) <= CONTEXT_BLOCK_LINES for block in blocks)
    # Không block nào vượt quá giới hạn ký tự (trừ trường hợp 1 dòng quá dài).
    for block in blocks:
        if len(block) > 1:
            assert sum(len(texts[idx]) + 1 for idx in block) <= CONTEXT_BLOCK_CHARS + 1


def test_build_blocks_handles_empty_list():
    assert TranslationService._build_blocks([]) == []


def test_google_batch_returns_none_for_empty_lines(service):
    assert service._google_batch([], "en", "vi") == []


def test_google_batch_caches_result_and_skips_second_request(service, monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append(params["q"])
        return FakeResponse(_google_payload(params["q"].split("\n")))

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    first = service._google_batch(["hello", "world"], "en", "vi")
    second = service._google_batch(["hello", "world"], "en", "vi")

    assert first == ["vi:hello", "vi:world"]
    assert second == first
    assert len(calls) == 1


def test_google_batch_retries_on_429_then_succeeds(service, monkeypatch):
    responses = [
        FakeResponse({}, status_code=429),
        FakeResponse(_google_payload(["hello"]), status_code=200),
    ]
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append(params["q"])
        return responses.pop(0)

    monkeypatch.setattr(ts_module.requests, "get", fake_get)
    monkeypatch.setattr(ts_module.time, "sleep", lambda _seconds: None)

    assert service._google_batch(["hello"], "en", "vi") == ["vi:hello"]
    assert len(calls) == 2


def test_google_batch_does_not_retry_on_client_error(service, monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append(params["q"])
        return FakeResponse({}, status_code=400)

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    assert service._google_batch(["hello"], "en", "vi") is None
    assert len(calls) == 1


def test_google_batch_returns_none_when_line_count_mismatches(service, monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        # Trả 1 dòng cho 2 dòng đầu vào => không thể ghép timestamp.
        return FakeResponse(_google_payload(["gộp"]))

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    assert service._google_batch(["a", "b"], "en", "vi") is None


def test_google_batch_returns_none_on_network_error(service, monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        raise ts_module.requests.RequestException("boom")

    monkeypatch.setattr(ts_module.requests, "get", fake_get)
    monkeypatch.setattr(ts_module.time, "sleep", lambda _seconds: None)

    assert service._google_batch(["hello"], "en", "vi") is None


def test_google_batch_returns_none_on_invalid_json(service, monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        return FakeResponse({"unexpected": True})

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    assert service._google_batch(["hello"], "en", "vi") is None


def test_translate_lines_falls_back_to_smaller_groups(service, monkeypatch):
    def fake_batch(lines, source_lang, target_lang):
        # Batch lớn "lỗi", batch <= 4 dòng dịch bình thường.
        if len(lines) > 4:
            return None
        return [f"vi:{line}" for line in lines]

    monkeypatch.setattr(service, "_google_batch", fake_batch)

    lines = [f"line{index}" for index in range(10)]
    assert service._translate_lines(lines, "en", "vi") == [f"vi:{line}" for line in lines]


def test_translate_lines_keeps_original_when_translation_fails(service, monkeypatch):
    monkeypatch.setattr(service, "_google_batch", lambda *args, **kwargs: None)

    lines = ["first", "second"]
    assert service._translate_lines(lines, "en", "vi") == lines


def test_translate_segments_same_language_returns_original(service):
    segments = [{"text": "xin chào", "start": 0.0, "end": 1.0}]

    result = service.translate_segments(segments, "vi", "vi")

    assert result[0]["text"] == "xin chào"
    assert result[0]["original_text"] == "xin chào"
    assert result[0]["translated_text"] == "xin chào"


def test_translate_segments_preserves_order_and_original_text(service, monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        return FakeResponse(_google_payload(params["q"].split("\n")))

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    segments = [
        {"text": f"line {index}", "start": float(index), "end": index + 0.5}
        for index in range(30)
    ]

    result = service.translate_segments(
        segments, source_lang="en", target_lang="vi", context="bài giảng AI", glossary={}
    )

    assert [seg["text"] for seg in result] == [f"vi:line {index}" for index in range(30)]
    assert [seg["original_text"] for seg in result] == [
        f"line {index}" for index in range(30)
    ]
    assert [seg["start"] for seg in result] == [float(index) for index in range(30)]


def test_translate_segments_applies_glossary(service, monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        lines = params["q"].split("\n")
        # Mô phỏng model để sót thuật ngữ gốc.
        return FakeResponse([[[line, line] for line in lines]])

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    segments = [{"text": "machine learning is fun", "start": 0.0, "end": 1.0}]
    result = service.translate_segments(
        segments,
        source_lang="en",
        target_lang="vi",
        context="AI",
        glossary={"machine learning": "học máy"},
    )

    assert result[0]["text"] == "học máy is fun"


def test_translate_segments_skips_empty_segments(service, monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append(params["q"])
        return FakeResponse(_google_payload(params["q"].split("\n")))

    monkeypatch.setattr(ts_module.requests, "get", fake_get)

    segments = [{"text": "", "start": 0.0, "end": 1.0}]
    result = service.translate_segments(
        segments, source_lang="en", target_lang="vi", context="", glossary={}
    )

    assert result[0]["text"] == ""
    assert calls == []


def test_cache_put_evicts_oldest_entry(monkeypatch):
    monkeypatch.setattr(ts_module, "_MAX_MEM_CACHE_ENTRIES", 2)

    ts_module._cache_put("a", "1")
    ts_module._cache_put("b", "2")
    ts_module._cache_put("c", "3")

    assert ts_module._cache_get("a") is None
    assert ts_module._cache_get("b") == "2"
    assert ts_module._cache_get("c") == "3"


def test_cache_get_returns_none_when_disabled(monkeypatch):
    monkeypatch.setattr(ts_module, "_MAX_MEM_CACHE_ENTRIES", 0)

    ts_module._cache_put("a", "1")

    assert ts_module._cache_get("a") is None


def test_cache_put_updates_existing_without_eviction(monkeypatch):
    monkeypatch.setattr(ts_module, "_MAX_MEM_CACHE_ENTRIES", 2)

    ts_module._cache_put("a", "1")
    ts_module._cache_put("b", "2")
    ts_module._cache_put("a", "updated")

    assert ts_module._cache_get("a") == "updated"
    assert ts_module._cache_get("b") == "2"


def test_parallel_blocks_share_executor_without_deadlock(service, monkeypatch):
    def fake_batch(lines, source_lang, target_lang):
        return [f"vi:{line}" for line in lines]

    monkeypatch.setattr(service, "_google_batch", fake_batch)

    segments = [
        {"text": f"line {index}", "start": float(index), "end": index + 0.5}
        for index in range(CONTEXT_BLOCK_LINES * 4)
    ]
    result: list = []

    worker = threading.Thread(
        target=lambda: result.extend(
            service.translate_segments(
                segments,
                source_lang="en",
                target_lang="vi",
                context="AI",
                glossary={},
            )
        )
    )
    worker.start()
    worker.join(timeout=10)

    assert not worker.is_alive()
    assert [seg["text"] for seg in result] == [
        f"vi:line {index}" for index in range(len(segments))
    ]
