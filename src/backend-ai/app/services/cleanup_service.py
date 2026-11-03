"""Dọn dẹp tài nguyên tạm của backend.

- File media trong thư mục ``uploads`` được xoá sau một khoảng TTL cấu hình.
- Các job streaming đã quá cũ bị loại khỏi bộ nhớ để tránh rò rỉ RAM.

Module này chỉ chứa hàm thuần (pure functions) để dễ viết unit test.
"""

import logging
import os
import time
from typing import Dict, Optional

logger = logging.getLogger("uvicorn")


def cleanup_uploads(
    directory: str,
    max_age_seconds: int,
    now: Optional[float] = None,
    protected_names: Optional[set] = None,
) -> int:
    """Xoá các file trong ``directory`` có mtime cũ hơn ``max_age_seconds``.

    ``protected_names`` chứa tên file (basename) vẫn đang được bài giảng tham
    chiếu; các file này không bị xoá dù đã quá TTL. Trả về số file đã xoá. Lỗi
    trên từng file được ghi log và bỏ qua để không làm hỏng vòng lặp dọn dẹp.
    """
    if not directory or not os.path.isdir(directory) or max_age_seconds <= 0:
        return 0

    protected = {
        os.path.basename(str(name))
        for name in (protected_names or set())
        if str(name).strip()
    }
    current = time.time() if now is None else now
    removed = 0

    for root, _dirs, files in os.walk(directory):
        for name in files:
            if name in protected:
                continue
            path = os.path.join(root, name)
            try:
                if current - os.path.getmtime(path) <= max_age_seconds:
                    continue
                os.remove(path)
                removed += 1
            except OSError as exc:  # pragma: no cover - phụ thuộc hệ điều hành
                logger.warning("Không thể xoá file tạm %s: %s", path, exc)

    if removed:
        logger.info("Đã dọn %s file tạm trong %s", removed, directory)
    return removed


def prune_jobs(
    jobs: Dict[str, dict],
    max_age_seconds: int,
    now: Optional[float] = None,
) -> int:
    """Xoá các job streaming đã tồn tại lâu hơn ``max_age_seconds``.

    Job không có ``created_at`` được xem là cũ (do dữ liệu cũ trước khi
    nâng cấp) và sẽ bị loại bỏ để đảm bảo bộ nhớ có giới hạn.
    """
    if not jobs or max_age_seconds <= 0:
        return 0

    current = time.time() if now is None else now
    removed = 0
    for job_id, job in list(jobs.items()):
        created = (job or {}).get("created_at")
        if created is None:
            jobs.pop(job_id, None)
            removed += 1
            continue
        try:
            age = current - float(created)
        except (TypeError, ValueError):
            age = max_age_seconds + 1
        if age > max_age_seconds:
            jobs.pop(job_id, None)
            removed += 1

    if removed:
        logger.info("Đã dọn %s job streaming cũ khỏi bộ nhớ", removed)
    return removed


def prune_rate_buckets(
    buckets: Dict[str, "deque"],
    max_idle_seconds: int,
    now: Optional[float] = None,
) -> int:
    """Loại bỏ bucket rate-limit không còn request trong ``max_idle_seconds``.

    ``buckets`` dùng timestamp ``time.monotonic()``. Hàm trả về số key đã xoá
    để tránh dictionary phình to khi có nhiều IP truy cập trong thời gian dài.
    """
    if not buckets or max_idle_seconds <= 0:
        return 0

    current = time.monotonic() if now is None else now
    removed = 0
    for key, bucket in list(buckets.items()):
        while bucket and current - bucket[0] > max_idle_seconds:
            bucket.popleft()
        if not bucket:
            buckets.pop(key, None)
            removed += 1

    if removed:
        logger.info("Đã dọn %s bucket rate-limit không hoạt động", removed)
    return removed
