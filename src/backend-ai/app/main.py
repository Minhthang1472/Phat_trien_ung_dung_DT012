import asyncio
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

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
from app.core.logging_config import configure_logging
from app.core.metrics import metrics_registry
from app.firebase_database import firebase_service
from app.api.websocket_router import ws_router
from app.routers import auth_router, export_router, history_router, video_router
from app.services.cleanup_service import cleanup_uploads, prune_jobs

logger = logging.getLogger("uvicorn")


async def _cleanup_loop() -> None:
    """Định kỳ dọn file upload và job streaming cũ để tránh đầy đĩa/RAM."""
    interval = max(60, settings.CLEANUP_INTERVAL_MINUTES * 60)
    upload_ttl = max(3600, settings.UPLOAD_TTL_HOURS * 3600)
    job_ttl = max(600, settings.STREAM_JOB_TTL_MINUTES * 60)

    while True:
        try:
            # Import muộn để tránh vòng lặp import khi khởi động
            from app.core.dependencies import UPLOAD_DIR
            from app.routers import video as video_module

            cleanup_uploads(UPLOAD_DIR, upload_ttl)
            prune_jobs(video_module.streaming_jobs, job_ttl)
        except Exception as exc:  # pragma: no cover - phòng thủ
            logger.warning("Vòng lặp dọn dẹp gặp lỗi: %s", exc)
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.LOG_LEVEL)
    logger.info(
        "Khởi động %s (env=%s, upload_ttl=%sh, job_ttl=%smin)",
        settings.PROJECT_NAME,
        settings.ENVIRONMENT,
        settings.UPLOAD_TTL_HOURS,
        settings.STREAM_JOB_TTL_MINUTES,
    )

    # Khởi động kết nối Google Firebase Cloud Firestore
    firebase_service.init_firebase()

    cleanup_task = asyncio.create_task(_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task


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
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Content-Disposition"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Gắn request-id và ghi log thời gian xử lý cho mọi request."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    started = time.perf_counter()
    status_code = 500
    response = None
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed = time.perf_counter() - started
        metrics_registry.observe(status_code, elapsed)
        log = logger.info if status_code < 500 else logger.error
        log(
            "%s %s -> %s (%.1fms) rid=%s",
            request.method,
            request.url.path,
            status_code,
            elapsed * 1000,
            request_id,
        )
        if response is not None:
            response.headers["X-Request-ID"] = request_id


# Kênh WebSocket Live-Caption Realtime
app.include_router(ws_router)

# Routers nghiệp vụ
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(video_router)
app.include_router(export_router)


@app.get("/health")
def health_check():
    """Liveness probe: tiến trình API còn sống."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "firebase": bool(firebase_service.db),
        "uptime_seconds": round(metrics_registry.uptime_seconds(), 3),
    }


@app.get("/health/ready")
def readiness_check(response: Response):
    """Readiness probe: chỉ 200 khi các phụ thuộc bắt buộc đã sẵn sàng."""
    from app.core.dependencies import UPLOAD_DIR

    checks = {
        "firebase": bool(firebase_service.db),
        "upload_dir": os.path.isdir(UPLOAD_DIR) and os.access(UPLOAD_DIR, os.W_OK),
        "jwt_secret": len(settings.JWT_SECRET) >= 32,
    }
    ready = all(checks.values())
    response.status_code = 200 if ready else 503
    return {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": round(metrics_registry.uptime_seconds(), 3),
    }


@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    """Số liệu vận hành tối giản theo định dạng Prometheus."""
    return metrics_registry.render()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "whisper_device": settings.WHISPER_DEVICE,
        "docs_url": "/docs",
    }
