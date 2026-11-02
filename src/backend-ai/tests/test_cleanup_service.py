import os
import time
from collections import deque

from app.services.cleanup_service import cleanup_uploads, prune_jobs, prune_rate_buckets


def _touch(path, age_seconds, now=None):
    now = time.time() if now is None else now
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("x")
    os.utime(path, (now - age_seconds, now - age_seconds))


def test_cleanup_uploads_removes_only_old_files(tmp_path):
    now = time.time()
    old_file = tmp_path / "old.mp4"
    new_file = tmp_path / "new.mp4"
    _touch(old_file, 7200, now)
    _touch(new_file, 60, now)

    removed = cleanup_uploads(str(tmp_path), max_age_seconds=3600, now=now)

    assert removed == 1
    assert not old_file.exists()
    assert new_file.exists()


def test_cleanup_uploads_missing_directory_is_noop():
    assert cleanup_uploads("khong-ton-tai", 3600) == 0
    assert cleanup_uploads("khong-ton-tai", 0) == 0


def test_prune_jobs_removes_stale_and_timestampless_jobs():
    now = time.time()
    jobs = {
        "fresh": {"created_at": now - 10},
        "stale": {"created_at": now - 9999},
        "legacy": {},
    }

    removed = prune_jobs(jobs, max_age_seconds=3600, now=now)

    assert removed == 2
    assert set(jobs) == {"fresh"}


def test_prune_jobs_empty():
    assert prune_jobs({}, 3600) == 0
    assert prune_jobs({"a": {"created_at": time.time()}}, 0) == 0


def test_prune_rate_buckets_drops_idle_and_empty_buckets():
    buckets = {
        "active": deque([1000.0, 1005.0]),
        "idle": deque([10.0]),
        "empty": deque(),
    }

    removed = prune_rate_buckets(buckets, max_idle_seconds=60, now=1010.0)

    assert removed == 2
    assert set(buckets) == {"active"}
    assert list(buckets["active"]) == [1000.0, 1005.0]
