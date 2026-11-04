"""Giới hạn số lần đăng nhập sai theo từng định danh (email/username).

Bộ đếm nằm trong RAM và áp dụng cho cả tài khoản không tồn tại, nhờ vậy kẻ
tấn công không thể dùng phản hồi 429 để dò xem email đã đăng ký hay chưa.
Với nhiều worker, nên bật Redis cho rate limit ở ``dependencies.py``; bộ đếm
này vẫn là lớp bảo vệ cuối trong từng tiến trình.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Deque, Dict, Optional

from app.core.config import settings

_FAILURES: Dict[str, Deque[float]] = {}
_LOCK = threading.Lock()
# Chặn phình RAM nếu kẻ tấn công thử nhiều định danh khác nhau.
_MAX_TRACKED_IDENTIFIERS = 10000


def _prune(bucket: Deque[float], now: float) -> None:
    window = max(1, settings.LOGIN_WINDOW_SECONDS)
    while bucket and now - bucket[0] > window:
        bucket.popleft()


def login_retry_after(key: str) -> Optional[int]:
    """Trả về số giây cần chờ nếu định danh đang bị khoá, ngược lại ``None``."""
    if not key:
        return None
    now = time.monotonic()
    with _LOCK:
        bucket = _FAILURES.get(key)
        if not bucket:
            return None
        _prune(bucket, now)
        if not bucket:
            _FAILURES.pop(key, None)
            return None
        if len(bucket) < settings.LOGIN_MAX_ATTEMPTS:
            return None
        elapsed = now - bucket[0]
        return max(1, int(max(1, settings.LOGIN_WINDOW_SECONDS) - elapsed))


def record_login_failure(key: str) -> None:
    if not key:
        return
    now = time.monotonic()
    with _LOCK:
        if key not in _FAILURES and len(_FAILURES) >= _MAX_TRACKED_IDENTIFIERS:
            # Dọn bucket hết hạn trước; nếu vẫn đầy thì bỏ định danh cũ nhất.
            for existing in list(_FAILURES):
                _prune(_FAILURES[existing], now)
                if not _FAILURES[existing]:
                    _FAILURES.pop(existing, None)
            while len(_FAILURES) >= _MAX_TRACKED_IDENTIFIERS:
                _FAILURES.pop(next(iter(_FAILURES)), None)
        bucket = _FAILURES.setdefault(key, deque())
        _prune(bucket, now)
        bucket.append(now)


def clear_login_failures(key: str) -> None:
    if not key:
        return
    with _LOCK:
        _FAILURES.pop(key, None)


def reset_login_throttle() -> None:
    """Xoá toàn bộ bộ đếm (dùng cho test và khi cần khôi phục khẩn cấp)."""
    with _LOCK:
        _FAILURES.clear()
