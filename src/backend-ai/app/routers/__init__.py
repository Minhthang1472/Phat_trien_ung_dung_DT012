from .auth import router as auth_router
from .history import router as history_router
from .video import router as video_router

__all__ = ["auth_router", "history_router", "video_router"]
