import os
import time
import logging
from collections import defaultdict, deque
from ipaddress import ip_address, ip_network
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


def _trusted_proxy_networks():
    networks = []
    for entry in settings.TRUSTED_PROXIES:
        try:
            networks.append(ip_network(entry, strict=False))
        except ValueError:
            logger.warning("Bỏ qua TRUSTED_PROXIES không hợp lệ: %s", entry)
    return networks


def _clean_ip(value: str) -> str:
    """Chuẩn hoá IP từ header, chấp nhận cả dạng ``1.2.3.4:port`` và ``[::1]:port``."""
    value = (value or "").strip().strip('"')
    if value.startswith("[") and "]" in value:
        return value[1:value.index("]")]
    if value.count(":") == 1:
        host, _, port = value.rpartition(":")
        if port.isdigit():
            return host
    return value


def client_ip_from_request(request: Request) -> str:
    """Lấy IP người dùng, chỉ tin ``X-Forwarded-For`` khi kết nối đến từ proxy tin cậy.

    Nếu ``TRUSTED_PROXIES`` để trống, luôn dùng IP kết nối trực tiếp để tránh
    giả mạo header. Khi có proxy, duyệt từ phải sang trái và bỏ qua các IP proxy
    tin cậy, trả về IP đầu tiên không thuộc danh sách.
    """
    peer = request.client.host if request.client else ""
    if not peer:
        return "unknown"

    networks = _trusted_proxy_networks()
    if not networks:
        return peer

    try:
        peer_ip = ip_address(_clean_ip(peer))
    except ValueError:
        return peer
    if not any(peer_ip in network for network in networks):
        return peer

    forwarded = request.headers.get("x-forwarded-for", "")
    candidates = [_clean_ip(item) for item in forwarded.split(",") if item.strip()]
    for candidate in reversed(candidates):
        try:
            candidate_ip = ip_address(candidate)
        except ValueError:
            continue
        if not any(candidate_ip in network for network in networks):
            return str(candidate_ip)
    # Mọi hop đều là proxy tin cậy: dùng hop trái nhất làm client.
    if candidates:
        return candidates[0]
    return str(peer_ip)


def _rate_limited(window_seconds: int) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail="Quá nhiều yêu cầu, vui lòng thử lại sau.",
        headers={"Retry-After": str(max(1, window_seconds))},
    )


def rate_limit(scope: str, max_requests: int, window_seconds: int):
    async def dependency(request: Request):
        client_ip = client_ip_from_request(request)
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
                    raise _rate_limited(window_seconds)
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
            raise _rate_limited(window_seconds)
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
    claims = auth_service.decode_access_token(credentials.credentials)
    user = auth_service.get_user(claims.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Không tìm thấy tài khoản.")
    if auth_service.is_account_deleted(user):
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hoá.")
    if auth_service.user_token_version(user) != int(claims.get("ver") or 0):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials:
        return None
    try:
        claims = auth_service.decode_access_token(credentials.credentials)
        user = auth_service.get_user(claims.get("sub", ""))
        if not user:
            return None
        if auth_service.is_account_deleted(user):
            return None
        if auth_service.user_token_version(user) != int(claims.get("ver") or 0):
            return None
        return user
    except HTTPException:
        return None


def user_public_data(user):
    return {
        "id": user.get("id"),
        "username": user.get("username") or user.get("display_name"),
        "email": user.get("email"),
        "display_name": user.get("display_name") or user.get("username") or user.get("email", "").split("@")[0],
        "avatar": user.get("avatar"),
        "auth_provider": user.get("auth_provider") or "password",
        "has_password": bool(user.get("password_hash")),
        "created_at": user.get("created_at"),
    }
