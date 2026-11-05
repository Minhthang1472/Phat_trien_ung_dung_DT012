import asyncio
import hmac
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

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
from app.routers import admin_router, admin_dashboard_router
from app.core.job_queue import JobQueueError, job_queue
from app.services.cleanup_service import cleanup_uploads, prune_rate_buckets

logger = logging.getLogger("uvicorn")


def _payload_too_large_response() -> JSONResponse:
    return JSONResponse(
        {
            "detail": (
                "Dữ liệu gửi lên quá lớn. Giới hạn hiện tại là "
                f"{settings.MAX_JSON_BODY_BYTES} byte."
            )
        },
        status_code=413,
    )


class BodySizeLimitMiddleware:
    """Chặn body JSON/form quá lớn trước khi ứng dụng đọc toàn bộ vào RAM.

    Kiểm tra ``Content-Length`` trước, đồng thời đọc tối đa
    ``MAX_JSON_BODY_BYTES`` khi client dùng ``Transfer-Encoding: chunked``
    (không có header độ dài). Body JSON/form được đệm tối đa 2 MB mặc định rồi
    chuyển tiếp cho ứng dụng. Upload file dùng multipart và đã có giới hạn
    riêng theo từng endpoint, nên middleware này bỏ qua multipart.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        content_type = headers.get("content-type", "").lower()
        if not content_type.startswith(
            ("application/json", "application/x-www-form-urlencoded")
        ):
            await self.app(scope, receive, send)
            return

        raw_length = headers.get("content-length", "").strip()
        if raw_length:
            try:
                length = int(raw_length)
            except ValueError:
                await JSONResponse(
                    {"detail": "Content-Length không hợp lệ."}, status_code=400
                )(scope, receive, send)
                return
            if length > settings.MAX_JSON_BODY_BYTES:
                await _payload_too_large_response()(scope, receive, send)
                return

        chunks = []
        total = 0
        while True:
            message = await receive()
            if message.get("type") == "http.disconnect":
                return
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > settings.MAX_JSON_BODY_BYTES:
                await _payload_too_large_response()(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        body = b"".join(chunks)
        delivered = False

        async def replay_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay_receive, send)


# Chỉ chấp nhận request-id do client gửi nếu đúng định dạng, tránh log injection
# và header quá dài.
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


async def _cleanup_loop() -> None:
    """Định kỳ dọn file upload và job streaming cũ để tránh đầy đĩa/RAM."""
    interval = max(60, settings.CLEANUP_INTERVAL_MINUTES * 60)
    upload_ttl = max(3600, settings.UPLOAD_TTL_HOURS * 3600)
    audio_ttl = max(3600, settings.AUDIO_TEMP_TTL_HOURS * 3600)
    job_ttl = max(600, settings.STREAM_JOB_TTL_MINUTES * 60)

    while True:
        try:
            # Import muộn để tránh vòng lặp import khi khởi động
            from app.core.dependencies import UPLOAD_DIR, _rate_buckets
            from app.services.audio_service import AUDIO_TEMP_DIR

            # Chỉ dọn uploads khi đọc được danh sách media đang được tham chiếu.
            # Nếu Firestore lỗi (None) thì bỏ qua để tránh xoá nhầm file còn dùng.
            # Firestore Admin SDK là đồng bộ; chạy trong thread để không chặn
            # event loop (API/WebSocket) khi quét dữ liệu lớn.
            referenced_media = await asyncio.to_thread(
                firebase_service.get_referenced_media_filenames
            )
            if referenced_media is None:
                logger.warning("Bỏ qua dọn uploads vì chưa đọc được dữ liệu Firestore.")
            else:
                await asyncio.to_thread(
                    cleanup_uploads,
                    UPLOAD_DIR,
                    upload_ttl,
                    protected_names=referenced_media,
                )
            await asyncio.to_thread(cleanup_uploads, AUDIO_TEMP_DIR, audio_ttl)
            try:
                await asyncio.to_thread(job_queue.prune, job_ttl)
            except JobQueueError as exc:
                logger.warning("Bỏ qua dọn job vì hàng đợi không khả dụng: %s", exc)
            prune_rate_buckets(_rate_buckets, max(3600, job_ttl))
        except Exception as exc:  # pragma: no cover - phòng thủ
            logger.warning("Vòng lặp dọn dẹp gặp lỗi: %s", exc)
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate()
    configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
    logger.info(
        "Khởi động %s (env=%s, upload_ttl=%sh, job_ttl=%smin)",
        settings.PROJECT_NAME,
        settings.ENVIRONMENT,
        settings.UPLOAD_TTL_HOURS,
        settings.STREAM_JOB_TTL_MINUTES,
    )

    # Khởi động kết nối Google Firebase Cloud Firestore
    firebase_service.init_firebase()

    if job_queue.is_redis:
        logger.info("Hàng đợi job dùng Redis; cần chạy worker riêng (python -m app.worker).")
        try:
            if not job_queue.worker_alive():
                logger.warning(
                    "Chưa thấy worker heartbeat. Job streaming sẽ chờ cho tới khi "
                    "worker được khởi động."
                )
        except JobQueueError as exc:
            logger.warning("Không kiểm tra được worker Redis: %s", exc)

    cleanup_task = asyncio.create_task(_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task


_DOCS_ENABLED = settings.ENABLE_DOCS or not settings.is_production()

app = FastAPI(
    title="Lecture Caption & Summary AI API",
    description="Hệ thống tự động bóc tách phụ đề, đồng bộ timestamps, dịch thuật đa ngôn ngữ và tóm tắt bài giảng",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

# Nén JSON/text lớn; Starlette tự bỏ qua audio/* và video/* để không phá stream.
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)

# Chặn Host header lạ (DNS rebinding/host poisoning). Luôn cho phép địa chỉ nội
# bộ để healthcheck của Docker hoạt động; môi trường test dùng host "testserver".
_allowed_hosts = list(dict.fromkeys(settings.ALLOWED_HOSTS))
for _local_host in ("127.0.0.1", "localhost"):
    if _local_host not in _allowed_hosts:
        _allowed_hosts.append(_local_host)
if not settings.is_production() and "testserver" not in _allowed_hosts:
    _allowed_hosts.append("testserver")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)
app.add_middleware(BodySizeLimitMiddleware)

# Cấu hình CORS để Mobile App (React Native) và Browser Extension có thể kết nối không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Admin-Token"],
    expose_headers=["X-Request-ID", "X-API-Version", "Content-Disposition", "Retry-After"],
)


@app.middleware("http")
async def api_version_middleware(request: Request, call_next):
    """Cho phép gọi song song ``/api/v1/...`` và ``/api/...`` (alias v1)."""
    path = request.scope.get("path", "")
    if path.startswith("/api/v1/"):
        request.scope["path"] = "/api/" + path[len("/api/v1/"):]
    response = await call_next(request)
    response.headers.setdefault("X-API-Version", "1")
    return response


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Gắn request-id và ghi log thời gian xử lý cho mọi request."""
    supplied_request_id = (request.headers.get("X-Request-ID") or "").strip()
    if _REQUEST_ID_RE.fullmatch(supplied_request_id):
        request_id = supplied_request_id
    else:
        request_id = uuid.uuid4().hex[:12]
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


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Thêm header bảo mật cho mọi response (kể cả lỗi)."""
    response = await call_next(request)
    headers = response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "no-referrer")
    headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    # API được extension (youtube.com) và mobile gọi cross-origin; CORP same-site
    # sẽ chặn audio/video tải trực tiếp bằng thẻ media.
    headers.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
    # Không để proxy/trình duyệt cache response chứa token hoặc dữ liệu quản trị.
    if request.url.path.startswith(("/api/auth/", "/api/admin/", "/admin")):
        headers["Cache-Control"] = "no-store"
        headers["Pragma"] = "no-cache"
    if request.url.path == "/admin" or request.url.path.startswith("/admin/"):
        # Dashboard là trang tĩnh duy nhất được phép tải script/style cùng origin.
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; connect-src 'self'; base-uri 'none'; "
            "form-action 'none'; frame-ancestors 'none'",
        )
    elif request.url.path not in {"/docs", "/redoc", "/openapi.json"}:
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'",
        )
    if settings.is_production():
        headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    return response


# Kênh WebSocket Live-Caption Realtime
app.include_router(ws_router)

# Routers nghiệp vụ
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(video_router)
app.include_router(export_router)
app.include_router(admin_router)
app.include_router(admin_dashboard_router)


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
def metrics(request: Request):
    """Số liệu vận hành tối giản theo định dạng Prometheus."""
    if settings.METRICS_TOKEN:
        supplied = request.headers.get("X-Metrics-Token", "")
        authorization = request.headers.get("Authorization", "")
        if not supplied and authorization.lower().startswith("bearer "):
            supplied = authorization[7:].strip()
        if not hmac.compare_digest(supplied, settings.METRICS_TOKEN):
            raise HTTPException(status_code=401, detail="Metrics token không hợp lệ.")
    elif settings.is_production():
        # Không public metrics ở production khi chưa đặt token.
        raise HTTPException(status_code=404, detail="Not Found")
    return metrics_registry.render()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "whisper_device": settings.WHISPER_DEVICE,
        "docs_url": "/docs" if _DOCS_ENABLED else None,
    }
