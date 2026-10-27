import os
import time
import logging
from collections import defaultdict, deque
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings
from app.services.auth_service import auth_service

logger = logging.getLogger("uvicorn")
_rate_buckets = defaultdict(deque)
_redis_client = None

# Thư mục lưu video upload ngoài static public route
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def rate_limit(scope: str, max_requests: int, window_seconds: int):
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = f"{scope}:{client_ip}"
        now = time.monotonic()
        global _redis_client
        if settings.REDIS_URL:
            try:
                if _redis_client is None:
                    import redis.asyncio as redis
                    _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                redis_key = f"lecture-ai:rate:{key}"
                count = await _redis_client.incr(redis_key)
                if count == 1:
                    await _redis_client.expire(redis_key, window_seconds)
                if count > max_requests:
                    raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu, vui lòng thử lại sau.")
                return
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("Redis rate limit unavailable, using local fallback: %s", exc)
                _redis_client = None
        bucket = _rate_buckets[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu, vui lòng thử lại sau.")
        bucket.append(now)
    return dependency


auth_rate_limit = rate_limit("auth", 10, 300)
heavy_rate_limit = rate_limit("heavy", 10, 60)

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập để sử dụng hồ sơ người dùng.",
        )
    claims = auth_service.decode_token(credentials.credentials)
    user = auth_service.get_user(claims.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Không tìm thấy tài khoản.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials:
        return None
    try:
        claims = auth_service.decode_token(credentials.credentials)
        return auth_service.get_user(claims.get("sub", ""))
    except HTTPException:
        return None


def user_public_data(user):
    return {
        "id": user.get("id"),
        "username": user.get("username") or user.get("display_name"),
        "email": user.get("email"),
        "display_name": user.get("display_name") or user.get("username") or user.get("email", "").split("@")[0],
        "avatar": user.get("avatar"),
        "created_at": user.get("created_at"),
    }
