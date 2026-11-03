"""Sao lưu các collection Firestore ra file JSON Lines.

Mỗi document được ghi thành một dòng JSON, gồm ``_id`` và toàn bộ dữ liệu.
File được đặt trong thư mục ``backups/<timestamp>/`` để dễ lưu trữ và khôi phục.

Ví dụ sử dụng (từ thư mục gốc dự án):

    python scripts/backup_firestore.py
    python scripts/backup_firestore.py --out D:\\backups --collections users,lectures
    python scripts/backup_firestore.py --credentials path\\to\\serviceAccountKey.json

Yêu cầu: đã cài ``firebase-admin`` (xem src/backend-ai/requirements.txt) và
có service account key của Firebase. Biến môi trường được đọc theo thứ tự:
``FIREBASE_CREDENTIALS_PATH`` trong ``src/backend-ai/.env`` rồi tới biến môi trường
của tiến trình.
"""

import argparse
import base64
import json
import os
import sys
from datetime import date, datetime
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

DEFAULT_COLLECTIONS = ["users", "lectures", "media_owners", "system_config"]


def _json_default(value):
    """Chuyển các kiểu dữ liệu đặc thù của Firestore sang JSON."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        return base64.b64encode(bytes(value)).decode("ascii")
    if hasattr(value, "latitude") and hasattr(value, "longitude"):
        return {"latitude": value.latitude, "longitude": value.longitude}
    if hasattr(value, "path"):
        return value.path
    return str(value)


def _resolve_credentials(explicit_path):
    if explicit_path:
        return explicit_path

    env_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "").strip()
    if not env_path:
        try:
            from app.core.config import settings  # noqa: F401  (nạp .env của backend)

            # load_dotenv() trong config đã đưa biến .env vào os.environ.
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


def backup_collections(collections, output_dir, credentials_path):
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(credentials_path))

    client = firestore.client()
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        # Backup chứa hash mật khẩu/OTP: giới hạn quyền đọc trên máy POSIX.
        os.chmod(output_dir, 0o700)
    except OSError:
        pass
    summary = {}

    for name in collections:
        target = output_dir / f"{name}.jsonl"
        count = 0
        with target.open("w", encoding="utf-8") as handle:
            for doc in client.collection(name).stream():
                payload = {"_id": doc.id, **(doc.to_dict() or {})}
                handle.write(json.dumps(payload, ensure_ascii=False, default=_json_default))
                handle.write("\n")
                count += 1
        try:
            os.chmod(target, 0o600)
        except OSError:
            pass
        summary[name] = count
        print(f"  - {name}: {count} document -> {target}")

    return summary


def main():
    parser = argparse.ArgumentParser(description="Sao lưu Firestore ra JSON Lines")
    parser.add_argument(
        "--collections",
        default=",".join(DEFAULT_COLLECTIONS),
        help="Danh sách collection, phân tách bằng dấu phẩy",
    )
    parser.add_argument("--out", default="backups", help="Thư mục gốc chứa bản sao lưu")
    parser.add_argument("--credentials", default=None, help="Đường dẫn service account key")
    args = parser.parse_args()

    collections = [item.strip() for item in args.collections.split(",") if item.strip()]
    if not collections:
        raise SystemExit("Danh sách collection rỗng.")

    credentials_path = _resolve_credentials(args.credentials)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = Path(args.out).expanduser().resolve() / stamp

    print(f"Sao lưu Firestore vào: {output_dir}")
    summary = backup_collections(collections, output_dir, credentials_path)
    total = sum(summary.values())
    print(f"Hoàn tất: {total} document trong {len(summary)} collection.")


if __name__ == "__main__":
    main()
