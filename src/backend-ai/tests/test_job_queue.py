import asyncio
import time

import pytest
from fastapi import HTTPException

from app.core.job_queue import JobQueueError, MemoryJobQueue, build_job_queue
from app.routers import video as video_module


def _job(job_id="job-1", owner_id="user-1", created_at=None):
    return {
        "job_id": job_id,
        "title": "Bài giảng thử nghiệm",
        "status": "processing",
        "progress": 30,
        "segments": [],
        "owner_id": owner_id,
        "created_at": time.time() if created_at is None else created_at,
    }


def test_memory_queue_lifecycle_and_fifo():
    queue = MemoryJobQueue(ttl_seconds=3600)
    queue.create_job(_job("job-1"))
    queue.create_job(_job("job-2"))

    assert queue.get_job("job-1")["status"] == "processing"
    assert queue.update_job("job-1", progress=55) is True
    assert queue.get_job("job-1")["progress"] == 55
    assert queue.update_job("khong-ton-tai", progress=1) is False

    queue.enqueue("job-1", {"audio_path": "/tmp/a.wav"})
    queue.enqueue("job-2", {"audio_path": "/tmp/b.wav"})
    assert queue.pending_count() == 2

    first = queue.dequeue()
    second = queue.dequeue()
    assert first["job_id"] == "job-1"
    assert second["job_id"] == "job-2"
    assert first["audio_path"] == "/tmp/a.wav"
    assert queue.dequeue() is None


def test_memory_queue_cancel_checks_owner():
    queue = MemoryJobQueue()
    queue.create_job(_job("job-1", owner_id="owner-a"))

    assert queue.request_cancel("job-1", "owner-b")["status"] == "forbidden"
    assert queue.is_cancelled("job-1") is False

    assert queue.request_cancel("job-1", "owner-a")["status"] == "cancelled"
    assert queue.is_cancelled("job-1") is True
    assert queue.get_job("job-1")["cancel_requested"] is True

    queue.clear_cancel("job-1")
    assert queue.is_cancelled("job-1") is False


def test_memory_queue_stats_and_recent_jobs():
    queue = MemoryJobQueue()
    queue.create_job(_job("job-1"))
    queue.create_job(_job("job-2"))
    queue.update_job("job-2", status="completed", progress=100)
    queue.enqueue("job-1", {})

    stats = queue.stats()
    assert stats["backend"] == "memory"
    assert stats["redis"] is False
    assert stats["pending"] == 1
    assert stats["processing"] == 1
    assert stats["completed"] == 1
    assert stats["total"] == 2
    assert stats["worker_alive"] is True

    recent = queue.list_jobs(limit=10)
    assert len(recent) == 2
    assert {"job_id", "status", "progress", "owner_id"}.issubset(recent[0])


def test_memory_queue_prune_removes_old_jobs_and_queue_entries():
    queue = MemoryJobQueue()
    old = time.time() - 7200
    queue.create_job(_job("old", created_at=old))
    queue.create_job(_job("new"))
    # Mô phỏng job không được cập nhật trong thời gian dài.
    queue._jobs["old"]["updated_at"] = old
    queue.enqueue("old", {})

    assert queue.prune(3600) == 1
    assert queue.get_job("old") is None
    assert queue.get_job("new") is not None
    assert queue.pending_count() == 0


def test_build_job_queue_picks_backend_without_connecting():
    memory = build_job_queue("")
    assert memory.is_redis is False

    redis_queue = build_job_queue("redis://localhost:6379/0")
    assert redis_queue.is_redis is True
    assert redis_queue.backend == "redis"
    # Không gọi mạng ở bước tạo; lỗi kết nối chỉ phát sinh khi thao tác.
    assert JobQueueError.__name__ == "JobQueueError"


def test_stream_status_treats_cancelled_and_failed_as_completed(monkeypatch):
    queue = MemoryJobQueue()
    queue.create_job(
        {
            "job_id": "job-1",
            "status": "cancelled",
            "progress": 20,
            "segments": [{"id": 0, "text": "xin chào"}],
            "owner_id": "user-1",
        }
    )
    monkeypatch.setattr(video_module, "job_queue", queue)

    result = asyncio.run(
        video_module.get_stream_status(job_id="job-1", user={"id": "user-1"})
    )
    assert result["status"] == "cancelled"
    assert result["is_completed"] is True
    assert result["progress"] == 100
    assert result["segments"][0]["text"] == "xin chào"

    queue.update_job("job-1", status="processing", progress=42)
    result = asyncio.run(
        video_module.get_stream_status(job_id="job-1", user={"id": "user-1"})
    )
    assert result["is_completed"] is False
    assert result["progress"] == 42

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            video_module.get_stream_status(job_id="job-1", user={"id": "user-2"})
        )
    assert exc_info.value.status_code == 403
