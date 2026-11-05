from .admin import router as admin_router
from .admin_dashboard import router as admin_dashboard_router
from .auth import router as auth_router
from .export import router as export_router
from .history import router as history_router
from .video import router as video_router

__all__ = [
    "admin_router",
    "admin_dashboard_router",
    "auth_router",
    "export_router",
    "history_router",
    "video_router",
]
