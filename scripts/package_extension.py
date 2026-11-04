"""Đóng gói browser extension thành file ZIP để phát hành.

Script đọc ``manifest.json`` để lấy phiên bản, kiểm tra các tệp bắt buộc rồi
nén toàn bộ thư mục extension (bỏ qua file tạm và README nội bộ).

Ví dụ (từ thư mục gốc dự án):

    python scripts/package_extension.py
    python scripts/package_extension.py --out dist
    python scripts/package_extension.py --allow-dev-hosts

Mặc định script cảnh báo nếu manifest còn host dev ``trycloudflare.com`` để
tránh phát hành nhầm bản trỏ vào tunnel tạm.
"""

import argparse
import json
import sys
import zipfile
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
EXTENSION_DIR = ROOT / "src" / "browser-extension"
DEFAULT_OUT = ROOT / "dist"
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db"}
EXCLUDED_SUFFIXES = {".map"}


def _iter_files(base: Path):
    for path in sorted(base.rglob("*")):
        if not path.is_file():
            continue
        if any(part.startswith(".") for part in path.relative_to(base).parts):
            continue
        if path.name in EXCLUDED_NAMES or path.suffix in EXCLUDED_SUFFIXES:
            continue
        if path.name.lower().startswith("readme"):
            continue
        yield path


def main() -> None:
    parser = argparse.ArgumentParser(description="Đóng gói browser extension")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Thư mục chứa file ZIP")
    parser.add_argument(
        "--allow-dev-hosts",
        action="store_true",
        help="Cho phép manifest chứa host dev (trycloudflare.com)",
    )
    args = parser.parse_args()

    manifest_path = EXTENSION_DIR / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit(f"Không tìm thấy {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = str(manifest.get("version") or "").strip()
    if not version:
        raise SystemExit("manifest.json thiếu version")

    dev_hosts = [
        host
        for host in manifest.get("host_permissions", [])
        if "trycloudflare.com" in host or "localhost" in host or "127.0.0.1" in host
    ]
    if dev_hosts and not args.allow_dev_hosts:
        raise SystemExit(
            "Manifest còn host dev: "
            + ", ".join(dev_hosts)
            + ". Dùng --allow-dev-hosts nếu đây là bản thử nghiệm."
        )
    if dev_hosts:
        print(f"CẢNH BÁO: manifest còn host dev: {', '.join(dev_hosts)}")

    out_dir = Path(args.out).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    archive = out_dir / f"extension-{version}.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in _iter_files(EXTENSION_DIR):
            bundle.write(path, path.relative_to(EXTENSION_DIR).as_posix())

    print(f"Đã đóng gói extension v{version} -> {archive}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"Lỗi đóng gói: {exc}", file=sys.stderr)
        raise SystemExit(1)
