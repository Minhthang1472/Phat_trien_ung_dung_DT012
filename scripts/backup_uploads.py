"""Sao lưu thư mục upload (video, audio, phụ đề) để phục hồi sau sự cố.

Hai chế độ:

* ``--source``: nén trực tiếp một thư mục (bind mount hoặc bản sao local).
* ``--docker-volume``: nén named volume của Docker qua container tạm; dùng cho
  volume ``lecture_uploads`` trong ``docker-compose.yml``.

Ví dụ (từ thư mục gốc dự án):

    python scripts/backup_uploads.py
    python scripts/backup_uploads.py --docker-volume lecture_uploads
    python scripts/backup_uploads.py --source D:\\data\\uploads --out D:\\backups

Nên chạy định kỳ (cron/systemd timer) cùng ``backup_firestore.py`` và lưu bản
sao ra ổ/không gian khác (offsite) để không mất cả hai khi máy chủ hỏng.
"""

import argparse
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = ROOT / "src" / "backend-ai" / "uploads"
DEFAULT_OUT = ROOT / "backups"


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def backup_directory(source: Path, out_dir: Path) -> Path:
    if not source.is_dir():
        raise SystemExit(f"Không tìm thấy thư mục nguồn: {source}")
    out_dir.mkdir(parents=True, exist_ok=True)
    archive_base = out_dir / f"uploads-{_stamp()}"
    archive = shutil.make_archive(str(archive_base), "zip", root_dir=str(source))
    print(f"Đã sao lưu {source} -> {archive}")
    return Path(archive)


def backup_docker_volume(volume: str, out_dir: Path, image: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    archive = out_dir / f"uploads-{_stamp()}.tar.gz"
    # Docker Desktop trên Windows chấp nhận đường dẫn dạng C:/... trong -v.
    host_dir = str(out_dir.resolve()).replace("\\", "/")
    command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{volume}:/data:ro",
        "-v",
        f"{host_dir}:/backup",
        image,
        "tar",
        "czf",
        f"/backup/{archive.name}",
        "-C",
        "/data",
        ".",
    ]
    print("Chạy:", " ".join(command))
    completed = subprocess.run(command)
    if completed.returncode != 0 or not archive.is_file():
        raise SystemExit(
            "Sao lưu volume thất bại. Kiểm tra Docker đang chạy và tên volume "
            f"'{volume}' tồn tại (docker volume ls)."
        )
    print(f"Đã sao lưu volume {volume} -> {archive}")
    return archive


def main() -> None:
    parser = argparse.ArgumentParser(description="Sao lưu file upload")
    parser.add_argument(
        "--source",
        default=str(DEFAULT_SOURCE),
        help="Thư mục upload cần nén (mặc định src/backend-ai/uploads)",
    )
    parser.add_argument(
        "--docker-volume",
        default="",
        help="Tên Docker volume cần nén (ưu tiên hơn --source)",
    )
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Thư mục chứa bản sao lưu")
    parser.add_argument(
        "--image",
        default="alpine:3.20",
        help="Image dùng để nén volume (cần có tar)",
    )
    args = parser.parse_args()

    out_dir = Path(args.out).expanduser().resolve()
    if args.docker_volume:
        backup_docker_volume(args.docker_volume, out_dir, args.image)
    else:
        backup_directory(Path(args.source).expanduser().resolve(), out_dir)


if __name__ == "__main__":
    main()
