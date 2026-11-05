"""Hàng đợi job xử lý video, hỗ trợ Redis và fallback in-memory.

Thiết kế tối giản, phù hợp đồ án:

* ``REDIS_URL`` trống: job được lưu trong RAM và chạy bằng thread nội bộ như
  hành vi cũ (một tiến trình API).
* ``REDIS_URL`` được cấu hình: trạng thái job lưu dạng JSON trong Redis, hàng
  đợi dùng ``RPUSH``/``BLPOP`` (FIFO) để tiến trình ``app.worker`` xử lý. API
  và worker có thể chạy trên nhiều container; job vẫn còn sau khi API restart
  trong thời gian TTL.

Mọi thao tác đều đồng bộ để dùng được từ cả endpoint async (qua threadpool) và
worker. Lỗi kết nối Redis được bọc thành ``JobQueueError`` để tầng API trả 503
thay vì treo request.
"""

import json
import logging
import threading
import time
from collections import deque
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger("uvicorn")

JOB_PREFIX = "lecture-ai:job"
CANCEL_TTL_SECONDS = 24 * 3600
WORKER_HEARTBEAT_TTL_SECONDS = 120


class JobQueueError(RuntimeError):
    """Redis không khả dụng hoặc dữ liệu job không đọc được."""


class MemoryJobQueue:
    """Hàng đợi trong RAM, dùng khi chưa cấu hình Redis."""

    backend = "memory"
    is_redis = False

    def __init__(self, ttl_seconds: int = 7200) -> None:
        self.ttl_seconds = max(300, int(ttl_seconds))
        self._jobs: Dict[str, dict] = {}
        self._queue: deque = deque()
        self._lock = threading.Lock()

    def create_job(self, job: Dict[str, Any]) -> None:
        now = time.time()
        with self._lock:
            stored = dict(job)
            stored.setdefault("created_at", now)
            stored["updated_at"] = now
            self._jobs[stored["job_id"]] = stored

    def get_job(self, job_id: str) -> Optional[dict]:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def update_job(self, job_id: str, **changes: Any) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job.update(changes)
            job["updated_at"] = time.time()
            return True

    def request_cancel(self, job_id: str, owner_id: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return {"status": "not_found"}
            if owner_id and job.get("owner_id") != owner_id:
                return {"status": "forbidden"}
            job["cancel_requested"] = True
            job["cancel_requested_at"] = time.time()
            job["updated_at"] = time.time()
            return {"status": "cancelled"}

    def is_cancelled(self, job_id: str) -> bool:
        with self._lock:
            return bool((self._jobs.get(job_id) or {}).get("cancel_requested"))

    def clear_cancel(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job["cancel_requested"] = False

    def enqueue(self, job_id: str, payload: Optional[Dict[str, Any]] = None) -> bool:
        item = dict(payload or {})
        item["job_id"] = job_id
        item["enqueued_at"] = time.time()
        with self._lock:
            self._queue.append(item)
        return True

    def dequeue(self, timeout: int = 5) -> Optional[dict]:
        with self._lock:
            return self._queue.popleft() if self._queue else None

    def pending_count(self) -> int:
        with self._lock:
            return len(self._queue)

    def heartbeat(self) -> None:
        """Không cần heartbeat khi worker nằm cùng tiến trình API."""

    def worker_alive(self) -> bool:
        return True

    def list_jobs(self, limit: int = 20) -> List[dict]:
        cap = max(1, min(int(limit or 20), 100))
        with self._lock:
            jobs = sorted(
                self._jobs.values(),
                key=lambda item: float(item.get("created_at") or 0),
                reverse=True,
            )[:cap]
            return [self._job_summary(job) for job in jobs]

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            jobs = list(self._jobs.values())
            pending = len(self._queue)
        counts = self._status_counts(jobs)
        return {
            "backend": self.backend,
            "redis": False,
            "available": True,
            "pending": pending,
            "processing": counts.get("processing", 0),
            "completed": counts.get("completed", 0),
            "failed": counts.get("failed", 0),
            "cancelled": counts.get("cancelled", 0),
            "total": len(jobs),
            "worker_alive": True,
            "worker_last_seen_seconds": 0,
        }

    def prune(self, max_age_seconds: int) -> int:
        if max_age_seconds <= 0:
            return 0
        now = time.time()
        removed_ids = set()
        with self._lock:
            for job_id, job in list(self._jobs.items()):
                updated = job.get("updated_at") or job.get("created_at")
                try:
                    age = now - float(updated)
                except (TypeError, ValueError):
                    age = max_age_seconds + 1
                if age > max_age_seconds:
                    self._jobs.pop(job_id, None)
                    removed_ids.add(job_id)
            if removed_ids:
                self._queue = deque(
                    item
                    for item in self._queue
                    if item.get("job_id") not in removed_ids
                )
        if removed_ids:
            logger.info("Đã dọn %s job streaming cũ khỏi bộ nhớ", len(removed_ids))
        return len(removed_ids)

    @staticmethod
    def _status_counts(jobs: List[dict]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for job in jobs:
            status = str(job.get("status") or "unknown").lower()
            counts[status] = counts.get(status, 0) + 1
        return counts

    @staticmethod
    def _job_summary(job: dict) -> dict:
        return {
            "job_id": job.get("job_id"),
            "title": job.get("title"),
            "status": job.get("status"),
            "progress": job.get("progress", 0),
            "owner_id": job.get("owner_id"),
            "created_at": job.get("created_at"),
            "updated_at": job.get("updated_at"),
            "cancel_requested": bool(job.get("cancel_requested")),
        }


class RedisJobQueue:
    """Hàng đợi phân tán dùng Redis list + key JSON có TTL."""

    backend = "redis"
    is_redis = True

    def __init__(self, redis_url: str, ttl_seconds: int = 7200) -> None:
        if not (redis_url or "").strip():
            raise ValueError("RedisJobQueue cần REDIS_URL")
        self.redis_url = redis_url.strip()
        self.ttl_seconds = max(300, int(ttl_seconds))
        self._redis = None

    # -- Kết nối ---------------------------------------------------------
    @property
    def client(self):
        if self._redis is None:
            import redis

            self._redis = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                health_check_interval=30,
            )
        return self._redis

    def _execute(self, operation, *args, **kwargs):
        try:
            return operation(*args, **kwargs)
        except Exception as exc:  # redis.RedisError và lỗi decode JSON
            raise JobQueueError(f"Redis không khả dụng: {exc}") from exc

    # -- Khoá Redis ------------------------------------------------------
    @staticmethod
    def _data_key(job_id: str) -> str:
        return f"{JOB_PREFIX}:data:{job_id}"

    @staticmethod
    def _cancel_key(job_id: str) -> str:
        return f"{JOB_PREFIX}:cancel:{job_id}"

    @staticmethod
    def _queue_key() -> str:
        return f"{JOB_PREFIX}:queue"

    @staticmethod
    def _index_key() -> str:
        return f"{JOB_PREFIX}:index"

    @staticmethod
    def _heartbeat_key() -> str:
        return f"{JOB_PREFIX}:worker:heartbeat"

    # -- Trạng thái job --------------------------------------------------
    def create_job(self, job: Dict[str, Any]) -> None:
        now = time.time()
        stored = dict(job)
        stored.setdefault("created_at", now)
        stored["updated_at"] = now
        job_id = str(stored["job_id"])
        raw = json.dumps(stored, ensure_ascii=False, default=str)
        client = self.client
        pipe = client.pipeline()
        pipe.set(self._data_key(job_id), raw, ex=self.ttl_seconds)
        pipe.zadd(self._index_key(), {job_id: float(stored["created_at"])})
        self._execute(pipe.execute)

    def get_job(self, job_id: str) -> Optional[dict]:
        raw = self._execute(self.client.get, self._data_key(job_id))
        if not raw:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError) as exc:
            raise JobQueueError(f"Dữ liệu job {job_id} không hợp lệ: {exc}") from exc

    def update_job(self, job_id: str, **changes: Any) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False
        job.update(changes)
        job["updated_at"] = time.time()
        raw = json.dumps(job, ensure_ascii=False, default=str)
        self._execute(self.client.set, self._data_key(job_id), raw, ex=self.ttl_seconds)
        return True

    def request_cancel(self, job_id: str, owner_id: Optional[str] = None) -> Dict[str, Any]:
        job = self.get_job(job_id)
        if not job:
            return {"status": "not_found"}
        if owner_id and job.get("owner_id") != owner_id:
            return {"status": "forbidden"}
        client = self.client
        pipe = client.pipeline()
        pipe.set(self._cancel_key(job_id), "1", ex=CANCEL_TTL_SECONDS)
        pipe.expire(self._data_key(job_id), self.ttl_seconds)
        self._execute(pipe.execute)
        self.update_job(
            job_id,
            cancel_requested=True,
            cancel_requested_at=time.time(),
        )
        return {"status": "cancelled"}

    def is_cancelled(self, job_id: str) -> bool:
        return bool(
            self._execute(self.client.exists, self._cancel_key(job_id))
        )

    def clear_cancel(self, job_id: str) -> None:
        self._execute(self.client.delete, self._cancel_key(job_id))

    # -- Hàng đợi --------------------------------------------------------
    def enqueue(self, job_id: str, payload: Optional[Dict[str, Any]] = None) -> bool:
        item = dict(payload or {})
        item["job_id"] = job_id
        item["enqueued_at"] = time.time()
        self._execute(
            self.client.rpush,
            self._queue_key(),
            json.dumps(item, ensure_ascii=False, default=str),
        )
        return True

    def dequeue(self, timeout: int = 5) -> Optional[dict]:
        result = self._execute(
            self.client.blpop,
            self._queue_key(),
            timeout=max(1, int(timeout)),
        )
        if not result:
            return None
        try:
            return json.loads(result[1])
        except (TypeError, ValueError) as exc:
            raise JobQueueError(f"Payload job không hợp lệ: {exc}") from exc

    def pending_count(self) -> int:
        return int(self._execute(self.client.llen, self._queue_key()) or 0)

    def heartbeat(self) -> None:
        self._execute(
            self.client.set,
            self._heartbeat_key(),
            str(time.time()),
            ex=WORKER_HEARTBEAT_TTL_SECONDS,
        )

    def worker_alive(self) -> bool:
        raw = self._execute(self.client.get, self._heartbeat_key())
        if not raw:
            return False
        try:
            return time.time() - float(raw) < WORKER_HEARTBEAT_TTL_SECONDS
        except (TypeError, ValueError):
            return False

    def list_jobs(self, limit: int = 20) -> List[dict]:
        cap = max(1, min(int(limit or 20), 100))
        client = self.client
        ids = self._execute(client.zrevrange, self._index_key(), 0, cap - 1) or []
        if not ids:
            return []
        pipe = client.pipeline()
        for job_id in ids:
            pipe.get(self._data_key(job_id))
        values = self._execute(pipe.execute) or []
        jobs = []
        missing = []
        for job_id, raw in zip(ids, values):
            if not raw:
                missing.append(job_id)
                continue
            try:
                jobs.append(MemoryJobQueue._job_summary(json.loads(raw)))
            except (TypeError, ValueError):
                continue
        if missing:
            self._execute(client.zrem, self._index_key(), *missing)
        return jobs

    def stats(self) -> Dict[str, Any]:
        jobs = self.list_jobs(limit=500)
        counts = MemoryJobQueue._status_counts(jobs)
        total = int(self._execute(self.client.zcard, self._index_key()) or 0)
        heartbeat_seconds = 0
        raw = self._execute(self.client.get, self._heartbeat_key())
        if raw:
            try:
                heartbeat_seconds = max(0, int(time.time() - float(raw)))
            except (TypeError, ValueError):
                heartbeat_seconds = WORKER_HEARTBEAT_TTL_SECONDS
        return {
            "backend": self.backend,
            "redis": True,
            "available": True,
            "pending": self.pending_count(),
            "processing": counts.get("processing", 0),
            "completed": counts.get("completed", 0),
            "failed": counts.get("failed", 0),
            "cancelled": counts.get("cancelled", 0),
            "total": total,
            "worker_alive": heartbeat_seconds < WORKER_HEARTBEAT_TTL_SECONDS,
            "worker_last_seen_seconds": heartbeat_seconds,
        }

    def prune(self, max_age_seconds: int) -> int:
        if max_age_seconds <= 0:
            return 0
        cutoff = time.time() - max_age_seconds
        client = self.client
        stale_ids = self._execute(
            client.zrangebyscore, self._index_key(), "-inf", cutoff
        ) or []
        if not stale_ids:
            return 0
        pipe = client.pipeline()
        for job_id in stale_ids:
            pipe.delete(self._data_key(job_id))
            pipe.delete(self._cancel_key(job_id))
        pipe.zrem(self._index_key(), *stale_ids)
        self._execute(pipe.execute)
        logger.info("Đã dọn %s job streaming cũ khỏi Redis", len(stale_ids))
        return len(stale_ids)


def build_job_queue(redis_url: str = "", ttl_seconds: int = 7200):
    """Tạo backend phù hợp; Redis lỗi kết nối được phát hiện khi gọi thao tác."""
    if (redis_url or "").strip():
        return RedisJobQueue(redis_url, ttl_seconds=ttl_seconds)
    return MemoryJobQueue(ttl_seconds=ttl_seconds)


# TTL được làm mới mỗi lần cập nhật, nên job dài vẫn sống trong lúc xử lý.
job_queue = build_job_queue(
    settings.REDIS_URL,
    ttl_seconds=max(3600, settings.STREAM_JOB_TTL_MINUTES * 60),
)
