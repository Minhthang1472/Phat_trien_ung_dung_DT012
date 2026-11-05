"""Kiểm thử worker streaming tách khỏi router (app/services/streaming_service.py)."""

import os
from types import SimpleNamespace

from app.services import streaming_service


class FakeQueue:
    """Hàng đợi tối giản ghi lại các lần cập nhật trạng thái."""

    def __init__(self, job, cancel_after=None):
        self.job = dict(job)
        self.cancel_after = cancel_after
        self.cancel_calls = 0
        self.updates = []

    def get_job(self, job_id):
        return dict(self.job) if job_id == self.job["job_id"] else None

    def update_job(self, job_id, **changes):
        self.updates.append(changes)
        self.job.update(changes)
        return True

    def is_cancelled(self, job_id):
        self.cancel_calls += 1
        if self.cancel_after is None:
            return False
        return self.cancel_calls > self.cancel_after


def _job(audio_path):
    return {
        "job_id": "job-stream",
        "video_url": "https://example.com/video",
        "title": "Bài giảng thử nghiệm",
        "duration_seconds": 100,
        "status": "processing",
        "progress": 30,
        "segments": [{"id": 0, "text": "câu cũ", "end": 5}],
        "language": "vi",
        "owner_id": "user-1",
        "quiz_target": 5,
        "audio_path": audio_path,
    }


def _patch_services(monkeypatch, segments):
    monkeypatch.setattr(
        streaming_service.whisper_service,
        "transcribe_audio_generator",
        lambda **_kwargs: iter(segments),
    )
    monkeypatch.setattr(
        streaming_service.translation_service,
        "build_video_brief",
        lambda *_args, **_kwargs: {"context": "ngữ cảnh", "glossary": None},
    )

    def translate(batch, **_kwargs):
        for item in batch:
            item["translated_text"] = f"vi:{item['text']}"
        return batch

    monkeypatch.setattr(
        streaming_service.translation_service, "translate_segments", translate
    )
    monkeypatch.setattr(
        streaming_service.summary_service,
        "summarize_transcript",
        lambda *_args, **_kwargs: {
            "summary": "Tóm tắt",
            "key_points": ["Ý chính"],
            "formulas_and_terms": ["Công thức"],
            "sections": [{"title": "Phần 1"}],
            "quiz": [{"question": "Q?"}],
            "quiz_target": 5,
            "mindmap": {"title": "Sơ đồ"},
            "exercises": [{"question": "Bài tập"}],
            "folder": "Bài giảng chung",
            "tags": ["Bài giảng"],
        },
    )
    monkeypatch.setattr(streaming_service, "normalize_quiz", lambda quiz, **_kwargs: quiz)
    monkeypatch.setattr(
        streaming_service, "normalize_mindmap", lambda mindmap, **_kwargs: mindmap
    )
    monkeypatch.setattr(
        streaming_service, "normalize_exercises", lambda exercises, **_kwargs: exercises
    )


def test_streaming_worker_completes_and_caches_lecture(tmp_path, monkeypatch):
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"fake")
    job = _job(str(audio_path))
    queue = FakeQueue(job)
    cached = {}
    _patch_services(
        monkeypatch,
        [
            {"text": "một", "start": 6, "end": 10, "detected_language": "en"},
            {"text": "hai", "start": 11, "end": 20, "detected_language": "en"},
            {"text": "ba", "start": 21, "end": 30, "detected_language": "en"},
            {"text": "bốn", "start": 31, "end": 40, "detected_language": "en"},
        ],
    )
    monkeypatch.setattr(streaming_service, "job_queue", queue)
    monkeypatch.setattr(
        streaming_service.firebase_service,
        "save_lecture_cache",
        lambda url, data: cached.update({"url": url, "data": data}),
    )

    streaming_service.run_background_transcription(
        "job-stream", str(audio_path), "vi", "en"
    )

    assert queue.job["status"] == "completed"
    assert queue.job["progress"] == 100
    assert queue.job["summary"] == "Tóm tắt"
    assert queue.job["detected_language"] == "en"
    assert [segment["id"] for segment in queue.job["segments"]] == [0, 1, 2, 3, 4]
    assert queue.job["segments"][1]["translated_text"] == "vi:một"
    assert cached["url"] == "https://example.com/video"
    assert cached["data"]["owner_id"] == "user-1"
    assert cached["data"]["language"] == "vi"
    assert not os.path.exists(audio_path)


def test_streaming_worker_stops_on_cancel_and_removes_audio(tmp_path, monkeypatch):
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"fake")
    job = _job(str(audio_path))
    # Lần gọi đầu (trước vòng lặp) trả False, lần kế tiếp trả True để dừng ngay.
    queue = FakeQueue(job, cancel_after=1)
    _patch_services(
        monkeypatch,
        [{"text": "một", "start": 6, "end": 10, "detected_language": "en"}],
    )
    monkeypatch.setattr(streaming_service, "job_queue", queue)

    streaming_service.run_background_transcription(
        "job-stream", str(audio_path), "vi", "en"
    )

    assert queue.job["status"] == "cancelled"
    assert queue.job["progress"] == 100
    assert not os.path.exists(audio_path)
