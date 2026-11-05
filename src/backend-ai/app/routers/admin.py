"""API quáº£n trá»‹ vÃ  dá»¯ liá»‡u cho dashboard ``/admin``.

Há»— trá»£ thá»‘ng kÃª há»‡ thá»‘ng, tráº¡ng thÃ¡i hÃ ng Ä‘á»£i, job gáº§n Ä‘Ã¢y, liá»‡t kÃª vÃ  khÃ´i
phá»¥c tÃ i khoáº£n xoÃ¡ má»m. ToÃ n bá»™ endpoint yÃªu cáº§u header ``X-Admin-Token`` khá»›p
vá»›i biáº¿n mÃ´i trÆ°á»ng ``ADMIN_TOKEN``. Náº¿u chÆ°a cáº¥u hÃ¬nh token, endpoint tráº£ 404
Ä‘á»ƒ khÃ´ng lá»™ sá»± tá»“n táº¡i cá»§a API.
"""

import hmac
import logging
import os
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query

from app.core.config import settings
from app.core.dependencies import UPLOAD_DIR, heavy_rate_limit
from app.core.job_queue import JobQueueError, job_queue
from app.firebase_database import firebase_service

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/api/admin", tags=["admin"])


def _storage_stats(directory: str) -> dict:
    """Äáº¿m file vÃ  dung lÆ°á»£ng trong thÆ° má»¥c upload (khÃ´ng Ä‘i theo symlink)."""
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
        logger.warning("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c dung lÆ°á»£ng upload: %s", exc)
    return {"files": files, "bytes": total_bytes}


def _queue_stats() -> dict:
    try:
        return job_queue.stats()
    except Exception as exc:  # pragma: no cover - phá»¥ thuá»™c Redis/backend
        logger.warning("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c tráº¡ng thÃ¡i hÃ ng Ä‘á»£i: %s", exc)
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
            "error": "KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c Redis.",
        }


def _recent_jobs(limit: int = 20) -> list:
    try:
        return job_queue.list_jobs(limit=limit)
    except JobQueueError as exc:
        logger.warning("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c danh sÃ¡ch job: %s", exc)
        return []


def require_admin_token(x_admin_token: str = Header(default="")) -> None:
    """XÃ¡c thá»±c token quáº£n trá»‹ báº±ng so sÃ¡nh háº±ng thá»i gian."""
    configured = (settings.ADMIN_TOKEN or "").strip()
    if not configured:
        # áº¨n endpoint khi chÆ°a cáº¥u hÃ¬nh, trÃ¡nh dÃ² tÃ¬m.
        raise HTTPException(status_code=404, detail="Not Found")
    provided = (x_admin_token or "").strip()
    # So sÃ¡nh dáº¡ng bytes Ä‘á»ƒ header chá»©a kÃ½ tá»± non-ASCII tráº£ 401 thay vÃ¬ 500.
    if not hmac.compare_digest(provided.encode("utf-8"), configured.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Admin token khÃ´ng há»£p lá»‡.")


@router.get("/users")
def list_deleted_users(
    limit: int = Query(50, ge=1, le=200),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Liá»‡t kÃª tÃ i khoáº£n Ä‘ang bá»‹ vÃ´ hiá»‡u hoÃ¡ (xoÃ¡ má»m)."""
    users = firebase_service.list_deleted_users(limit=limit)
    return {"items": users, "total": len(users)}


@router.post("/users/{user_id}/restore")
def restore_deleted_user(
    user_id: str = Path(..., min_length=1, max_length=128),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """KhÃ´i phá»¥c tÃ i khoáº£n Ä‘Ã£ xoÃ¡ má»m; dá»¯ liá»‡u bÃ i giáº£ng/media giá»¯ nguyÃªn."""
    result = firebase_service.restore_user_account(user_id)
    if result.get("reason") == "not_found":
        raise HTTPException(status_code=404, detail="KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.")
    if result.get("reason") == "not_deleted":
        raise HTTPException(status_code=409, detail="TÃ i khoáº£n hiá»‡n khÃ´ng bá»‹ vÃ´ hiá»‡u hoÃ¡.")
    if not result.get("restored"):
        raise HTTPException(status_code=500, detail="KhÃ´ng thá»ƒ khÃ´i phá»¥c tÃ i khoáº£n.")

    logger.warning("Quáº£n trá»‹ viÃªn Ä‘Ã£ khÃ´i phá»¥c tÃ i khoáº£n %s", user_id)
    return {
        "restored": True,
        "message": "ÄÃ£ khÃ´i phá»¥c tÃ i khoáº£n. NgÆ°á»i dÃ¹ng cÃ³ thá»ƒ Ä‘Äƒng nháº­p láº¡i.",
        "user": result.get("user"),
    }


@router.get("/overview")
def admin_overview(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Dá»¯ liá»‡u tá»•ng há»£p cho dashboard: thá»‘ng kÃª, tÃ i khoáº£n xoÃ¡ má»m, job gáº§n Ä‘Ã¢y."""
    return {
        "users": {
            "total": firebase_service.count_collection("users"),
            "deleted": firebase_service.count_deleted_users(),
        },
        "lectures": firebase_service.count_collection("lectures"),
        "media_owners": firebase_service.count_collection("media_owners"),
        "storage": _storage_stats(UPLOAD_DIR),
        "queue": _queue_stats(),
        "deleted_users": firebase_service.list_deleted_users(limit=50),
        "jobs": _recent_jobs(20),
        "generated_at": time.time(),
    }


@router.get("/stats")
def admin_stats(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Thá»‘ng kÃª tá»•ng quan cho váº­n hÃ nh vÃ  kiá»ƒm tra sá»©c khoáº» há»‡ thá»‘ng."""
    return {
        "users": {
            "total": firebase_service.count_collection("users"),
            "deleted": firebase_service.count_deleted_users(),
        },
        "lectures": firebase_service.count_collection("lectures"),
        "media_owners": firebase_service.count_collection("media_owners"),
        "storage": _storage_stats(UPLOAD_DIR),
        "queue": _queue_stats(),
        "generated_at": time.time(),
    }


@router.get("/queue")
def admin_queue(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Tráº¡ng thÃ¡i hÃ ng Ä‘á»£i job (Redis hoáº·c in-memory) vÃ  worker heartbeat."""
    return _queue_stats()


@router.get("/jobs")
def admin_jobs(
    limit: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Danh sÃ¡ch job gáº§n Ä‘Ã¢y Ä‘á»ƒ theo dÃµi tiáº¿n Ä‘á»™ xá»­ lÃ½ video."""
    items = _recent_jobs(limit)
    return {"items": items, "total": len(items)}
