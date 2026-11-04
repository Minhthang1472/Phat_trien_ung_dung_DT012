"""Bổ sung ``cached_at`` cho các bài giảng cũ để lịch sử phân trang server-side.

Trước đây ``lectures`` chỉ có ``created_at`` hoặc không có mốc thời gian, nên
truy vấn ``order_by("cached_at")`` bỏ qua các tài liệu đó. Script này gán
``cached_at`` theo thứ tự ưu tiên:

1. ``cached_at`` đã có (bỏ qua).
2. ``created_at`` (chuỗi ISO hoặc timestamp Firestore).
3. ``create_time`` của document do Firestore ghi lại.
4. Thời điểm chạy script.

Ví dụ (từ thư mục gốc dự án):

    python scripts/backfill_cached_at.py --dry-run
    python scripts/backfill_cached_at.py
    python scripts/backfill_cached_at.py --credentials secrets/serviceAccountKey.json

Chạy sau khi deploy composite index trong ``firestore.indexes.json``.
"""

import argparse
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "src" / "backend-ai"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _resolve_credentials(explicit_path: str | None) -> str:
    if explicit_path:
        return explicit_path

    env_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "").strip()
    if not env_path:
        try:
            from app.core.config import settings  # noqa: F401  (nạp .env của backend)

            env_path = (
                os.getenv("FIREBASE_CREDENTIALS_PATH", "")
                or getattr(settings, "FIREBASE_CREDENTIALS_PATH", "")
            ).strip()
        except Exception:
            env_path = ""

    if not env_path:
        raise SystemExit(
            "Không tìm thấy service account key. Truyền --credentials hoặc đặt "
            "FIREBASE_CREDENTIALS_PATH."
        )
    if not os.path.isabs(env_path):
        candidate = BACKEND_DIR / env_path
        if candidate.exists():
            return str(candidate)
    return env_path


def _parse_datetime(value) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        text = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return None


def backfill(dry_run: bool = False, credentials_path: str | None = None) -> int:
    import firebase_admin
    from firebase_admin import credentials, firestore

    credentials_path = _resolve_credentials(credentials_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(credentials_path))
    client = firestore.client()

    updated = 0
    skipped = 0
    fallback = datetime.now(timezone.utc)

    for doc in client.collection("lectures").stream():
        data = doc.to_dict() or {}
        if data.get("cached_at"):
            skipped += 1
            continue

        value = (
            _parse_datetime(data.get("created_at"))
            or _parse_datetime(getattr(doc, "create_time", None))
            or fallback
        )
        if dry_run:
            print(f"[dry-run] {doc.id} -> cached_at={value.isoformat()}")
        else:
            doc.reference.update({"cached_at": value})
        updated += 1

    print(
        f"{'Sẽ cập nhật' if dry_run else 'Đã cập nhật'} {updated} document, "
        f"bỏ qua {skipped} document đã có cached_at."
    )
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Bổ sung cached_at cho lectures")
    parser.add_argument("--credentials", default=None, help="Đường dẫn service account key")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ in ra thay đổi, không ghi vào Firestore",
    )
    args = parser.parse_args()
    backfill(dry_run=args.dry_run, credentials_path=args.credentials)


if __name__ == "__main__":
    main()
