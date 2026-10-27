import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Tự động vá (patch) PyAV nếu đang dùng phiên bản mới (av >= 19.0) không còn hỗ trợ tham số metadata_errors
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception:
    pass

from app.core.config import settings
from app.firebase_database import firebase_service
from app.api.websocket_router import ws_router
from app.routers import auth_router, history_router, video_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động kết nối Google Firebase Cloud Firestore
    firebase_service.init_firebase()
    yield


app = FastAPI(
    title="Lecture Caption & Summary AI API",
    description="Hệ thống tự động bóc tách phụ đề, đồng bộ timestamps, dịch thuật đa ngôn ngữ và tóm tắt bài giảng",
    version="2.0.0",
    lifespan=lifespan,
)

# Cấu hình CORS để Mobile App (React Native) và Browser Extension có thể kết nối không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Kênh WebSocket Live-Caption Realtime
app.include_router(ws_router)

# Routers nghiệp vụ
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(video_router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "whisper_device": settings.WHISPER_DEVICE,
        "docs_url": "/docs",
    }
