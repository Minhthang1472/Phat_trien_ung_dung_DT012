"""Khôi phục Firestore từ thư mục backup do ``backup_firestore.py`` tạo.

Mỗi collection là một file ``<collection>.jsonl`` với mỗi dòng gồm ``_id`` và
toàn bộ dữ liệu document. Script ghi đè document cùng ID (mặc định) hoặc trộn
với dữ liệu hiện có (``--merge``). Các trường thời gian đã bị chuyển thành
chuỗi ISO khi backup sẽ được chuyển lại thành timestamp Firestore.

Ví dụ (từ thư mục gốc dự án):

    python scripts/restore_firestore.py --input backups/20260101-120000 --dry-run
    python scripts/restore_firestore.py --input backups/20260101-120000
    python scripts/restore_firestore.py --input backups/20260101-120000 --merge

CẢNH BÁO: không chạy ``--merge`` lên collection vừa bị xoá nhầm nếu muốn khôi
phục chính xác trạng thái cũ; chế độ mặc định (ghi đè) mới phục hồi đúng backup.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
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

# Các trường lưu mốc thời gian; backup đã chuyển chúng thành chuỗi ISO.
TIMESTAMP_FIELDS = {
    "cached_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "rotated_at",
    "otp_expires_at",
    "verification_expires_at",
    "reset_expires_at",
    "password_changed_at",
    "last_login_at",
}


def _resolve_credentials(explicit_path):
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


def _parse_datetime(value):
    if not isinstance(value, str) or not value.strip():
        return value
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return value
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _restore_value(key, value):
    if isinstance(value, dict):
        return {k: _restore_value(k, v) for k, v in value.items()}
    if isinstance(value, list):
        return [_restore_value(key, item) for item in value]
    if key in TIMESTAMP_FIELDS and isinstance(value, str):
        return _parse_datetime(value)
    return value


def _load_records(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_number}: JSON không hợp lệ ({exc})")
            doc_id = payload.pop("_id", None)
            if not doc_id:
                raise SystemExit(f"{path}:{line_number}: thiếu _id")
            yield str(doc_id), {
                key: _restore_value(key, value) for key, value in payload.items()
            }


def restore(input_dir: Path, collections, merge=False, dry_run=False, credentials_path=None):
    import firebase_admin
    from firebase_admin import credentials, firestore

    credentials_path = _resolve_credentials(credentials_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(credentials_path))
    client = firestore.client()

    if not input_dir.is_dir():
        raise SystemExit(f"Không tìm thấy thư mục backup: {input_dir}")

    files = sorted(input_dir.glob("*.jsonl"))
    if collections:
        wanted = set(collections)
        files = [path for path in files if path.stem in wanted]
    if not files:
        raise SystemExit(f"Không có file .jsonl phù hợp trong {input_dir}")

    summary = {}
    for path in files:
        name = path.stem
        count = 0
        for doc_id, payload in _load_records(path):
            if dry_run:
                print(f"[dry-run] {name}/{doc_id}: {len(payload)} trường")
            else:
                client.collection(name).document(doc_id).set(payload, merge=merge)
            count += 1
        summary[name] = count
        print(f"  - {name}: {count} document")

    total = sum(summary.values())
    print(
        f"{'Sẽ khôi phục' if dry_run else 'Đã khôi phục'} {total} document "
        f"trong {len(summary)} collection."
    )
    return summary


def main():
    parser = argparse.ArgumentParser(description="Khôi phục Firestore từ JSON Lines")
    parser.add_argument(
        "--input",
        required=True,
        help="Thư mục backup (chứa users.jsonl, lectures.jsonl, ...)",
    )
    parser.add_argument(
        "--collections",
        default="",
        help="Chỉ khôi phục các collection này, phân tách bằng dấu phẩy",
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Trộn vào document hiện có thay vì ghi đè toàn bộ",
    )
    parser.add_argument("--credentials", default=None, help="Đường dẫn service account key")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ kiểm tra, không ghi")
    args = parser.parse_args()

    collections = [item.strip() for item in args.collections.split(",") if item.strip()]
    restore(
        Path(args.input).expanduser().resolve(),
        collections,
        merge=args.merge,
        dry_run=args.dry_run,
        credentials_path=args.credentials,
    )


if __name__ == "__main__":
    main()
