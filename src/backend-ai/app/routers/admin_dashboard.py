"""Phục vụ giao diện quản trị tĩnh tại ``/admin``.

Trang chỉ là HTML/CSS/JS thuần, không cần build step. Dữ liệu vẫn lấy từ
``/api/admin/*`` và yêu cầu header ``X-Admin-Token``; trang tĩnh không chứa
token nên có thể phục vụ công khai mà không lộ dữ liệu.
"""

import os

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["admin-dashboard"], include_in_schema=False)

_STATIC_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "static",
    "admin",
)


def _static_file(filename: str, media_type: str) -> FileResponse:
    return FileResponse(os.path.join(_STATIC_DIR, filename), media_type=media_type)


@router.get("/admin", include_in_schema=False)
def admin_dashboard_page():
    return _static_file("index.html", "text/html; charset=utf-8")


@router.get("/admin/app.js", include_in_schema=False)
def admin_dashboard_script():
    return _static_file("app.js", "text/javascript; charset=utf-8")


@router.get("/admin/styles.css", include_in_schema=False)
def admin_dashboard_styles():
    return _static_file("styles.css", "text/css; charset=utf-8")
