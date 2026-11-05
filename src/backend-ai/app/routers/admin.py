"""API quản trị và dữ liệu cho dashboard ``/admin``.

Hỗ trợ thống kê hệ thống, trạng thái hàng đợi, job gần đây, liệt kê và khôi
phục tài khoản xoá mềm. Toàn bộ endpoint yêu cầu header ``X-Admin-Token`` khớp
với biến môi trường ``ADMIN_TOKEN``. Nếu chưa cấu hình token, endpoint trả 404
để không lộ sự tồn tại của API.
"""

import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query

from app.core.config import settings
from app.core.dependencies import heavy_rate_limit
from app.firebase_database import firebase_service
from app.services.admin_service import (
    build_overview,
    build_stats,
    queue_stats,
    recent_jobs,
)

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin_token(x_admin_token: str = Header(default="")) -> None:
    """Xác thực token quản trị bằng so sánh hằng thời gian."""
    configured = (settings.ADMIN_TOKEN or "").strip()
    if not configured:
        # Ẩn endpoint khi chưa cấu hình, tránh dò tìm.
        raise HTTPException(status_code=404, detail="Not Found")
    provided = (x_admin_token or "").strip()
    # So sánh dạng bytes để header chứa ký tự non-ASCII trả 401 thay vì 500.
    if not hmac.compare_digest(provided.encode("utf-8"), configured.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Admin token không hợp lệ.")


@router.get("/users")
def list_deleted_users(
    limit: int = Query(50, ge=1, le=200),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Liệt kê tài khoản đang bị vô hiệu hoá (xoá mềm)."""
    users = firebase_service.list_deleted_users(limit=limit)
    return {"items": users, "total": len(users)}


@router.post("/users/{user_id}/restore")
def restore_deleted_user(
    user_id: str = Path(..., min_length=1, max_length=128),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Khôi phục tài khoản đã xoá mềm; dữ liệu bài giảng/media giữ nguyên."""
    result = firebase_service.restore_user_account(user_id)
    if result.get("reason") == "not_found":
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    if result.get("reason") == "not_deleted":
        raise HTTPException(status_code=409, detail="Tài khoản hiện không bị vô hiệu hoá.")
    if not result.get("restored"):
        raise HTTPException(status_code=500, detail="Không thể khôi phục tài khoản.")

    logger.warning("Quản trị viên đã khôi phục tài khoản %s", user_id)
    return {
        "restored": True,
        "message": "Đã khôi phục tài khoản. Người dùng có thể đăng nhập lại.",
        "user": result.get("user"),
    }


@router.get("/overview")
def admin_overview(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Dữ liệu tổng hợp cho dashboard: thống kê, tài khoản xoá mềm, job gần đây."""
    return build_overview()


@router.get("/stats")
def admin_stats(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Thống kê tổng quan cho vận hành và kiểm tra sức khoẻ hệ thống."""
    return build_stats()


@router.get("/queue")
def admin_queue(
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Trạng thái hàng đợi job (Redis hoặc in-memory) và worker heartbeat."""
    return queue_stats()


@router.get("/jobs")
def admin_jobs(
    limit: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin_token),
    _limit=Depends(heavy_rate_limit),
):
    """Danh sách job gần đây để theo dõi tiến độ xử lý video."""
    items = recent_jobs(limit)
    return {"items": items, "total": len(items)}
