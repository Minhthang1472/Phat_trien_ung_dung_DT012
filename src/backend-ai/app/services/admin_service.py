"""Tổng hợp dữ liệu cho dashboard quản trị.

Tách khỏi router để endpoint chỉ còn phần xác thực và trả JSON. Các hàm ở đây
đồng bộ vì Firestore Admin SDK và Redis client đều là API đồng bộ; FastAPI sẽ
chạy endpoint ``def`` trong threadpool.
"""

import logging
import os
import time
from typing import Any, Dict, List

from app.core.dependencies import UPLOAD_DIR
from app.core.job_queue import JobQueueError, job_queue
from app.firebase_database import firebase_service

logger = logging.getLogger("uvicorn")


def storage_stats(directory: str = UPLOAD_DIR) -> Dict[str, int]:
    """Đếm file và dung lượng trong thư mục upload (không đi theo symlink)."""
    files = 0
    total_bytes = 0
    try:
        for root, _dirs, names in os.walk(directory, followlinks=False):
            for name in names:
                path = os.path.join(root, name)
                try:
                    stat = os.stat(path, follow_symlinks=False)
                except OSError:
                    continue
                files += 1
                total_bytes += stat.st_size
    except OSError as exc:
        logger.warning("Không đọc được dung lượng upload: %s", exc)
    return {"files": files, "bytes": total_bytes}


def queue_stats() -> Dict[str, Any]:
    """Trạng thái hàng đợi; trả object lỗi thay vì làm dashboard 500."""
    try:
        return job_queue.stats()
    except Exception as exc:  # pragma: no cover - phụ thuộc Redis/backend
        logger.warning("Không đọc được trạng thái hàng đợi: %s", exc)
        return {
            "backend": job_queue.backend,
            "redis": job_queue.is_redis,
            "available": False,
            "pending": 0,
            "processing": 0,
            "completed": 0,
            "failed": 0,
            "cancelled": 0,
            "total": 0,
            "worker_alive": False,
            "worker_last_seen_seconds": None,
            "error": "Không kết nối được Redis.",
        }


def recent_jobs(limit: int = 20) -> List[dict]:
    try:
        return job_queue.list_jobs(limit=limit)
    except JobQueueError as exc:
        logger.warning("Không đọc được danh sách job: %s", exc)
        return []


def build_stats() -> Dict[str, Any]:
    """Thống kê user/bài giảng/media/dung lượng và hàng đợi."""
    return {
        "users": {
            "total": firebase_service.count_collection("users"),
            "deleted": firebase_service.count_deleted_users(),
        },
        "lectures": firebase_service.count_collection("lectures"),
        "media_owners": firebase_service.count_collection("media_owners"),
        "storage": storage_stats(),
        "queue": queue_stats(),
        "generated_at": time.time(),
    }


def build_overview() -> Dict[str, Any]:
    """Dữ liệu một lần gọi cho dashboard: thống kê + tài khoản xoá + job."""
    data = build_stats()
    data["deleted_users"] = firebase_service.list_deleted_users(limit=50)
    data["jobs"] = recent_jobs(20)
    return data
