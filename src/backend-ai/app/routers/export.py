import io
import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_current_user, heavy_rate_limit
from app.export_service import (
    SUPPORTED_FORMATS,
    build_export_bytes,
    get_mime_type,
)
from app.firebase_database import firebase_service

router = APIRouter(prefix="/api/export", tags=["export"])


def _safe_filename(title: str, fallback: str = "bai_giang") -> str:
    name = (title or "").strip()
    name = re.sub(r"[\\/:*?\"<>|\r\n\t]+", " ", name)
    name = re.sub(r"\s+", "_", name).strip("._")
    return (name or fallback)[:80]


@router.get("")
async def export_lecture(
    video_url: str = Query(..., description="URL video bài giảng cần xuất"),
    format: str = Query("pdf", description="pdf | docx | md"),
    user=Depends(get_current_user),
    _limit=Depends(heavy_rate_limit),
):
    """Xuất tài liệu bài giảng (tóm tắt, mindmap, quiz, phụ đề) từ cache Firebase."""
    fmt = (format or "pdf").lower().strip()
    if fmt == "markdown":
        fmt = "md"
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Định dạng chỉ hỗ trợ: pdf, docx, md.")

    clean_url = (video_url or "").strip()
    if not clean_url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp video_url hợp lệ.")

    data = firebase_service.get_lecture_cache(clean_url, owner_id=user["id"])
    if not data:
        raise HTTPException(
            status_code=404,
            detail="Bài giảng chưa có trong bộ nhớ đệm. Hãy xử lý video trước khi xuất tài liệu.",
        )

    # Bổ sung metadata còn thiếu để tài liệu luôn có bìa đầy đủ
    data = dict(data)
    data.setdefault("video_url", clean_url)
    data["owner_id"] = user["id"]

    try:
        payload = build_export_bytes(data, fmt)
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Thiếu thư viện xuất tài liệu trên máy chủ: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể tạo tài liệu: {exc}") from exc

    filename = f"{_safe_filename(data.get('title'))}.{fmt}"
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        "Content-Length": str(len(payload)),
        "Cache-Control": "no-store",
    }
    return StreamingResponse(io.BytesIO(payload), media_type=get_mime_type(fmt), headers=headers)
