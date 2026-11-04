"""Kiểm tra nhanh sức khoẻ backend sau khi deploy hoặc trước khi mở traffic.

Kiểm tra ``/health``, ``/health/ready`` và (tuỳ chọn) ``/metrics`` với token.
Thoát mã 1 nếu có endpoint lỗi để dùng được trong cron/CI.

Ví dụ:

    python scripts/check_health.py --base-url https://api.example.com
    python scripts/check_health.py --base-url https://api.example.com --metrics-token $METRICS_TOKEN
    python scripts/check_health.py --base-url http://localhost:8000 --retries 5
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _request(url: str, token: str = "", timeout: float = 10.0):
    headers = {"User-Agent": "lecture-ai-healthcheck/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read(4096).decode("utf-8", errors="replace")
        return response.status, body


def check(url: str, token: str = "", timeout: float = 10.0):
    try:
        status, body = _request(url, token, timeout)
    except urllib.error.HTTPError as exc:
        detail = exc.read(512).decode("utf-8", errors="replace")
        return False, f"HTTP {exc.code}: {detail.strip()}"
    except Exception as exc:  # noqa: BLE001 - báo mọi lỗi mạng cho người vận hành
        return False, str(exc)

    if status >= 400:
        return False, f"HTTP {status}: {body.strip()}"
    try:
        payload = json.loads(body)
    except ValueError:
        return True, body.strip()[:200]
    return True, json.dumps(payload, ensure_ascii=False)[:300]


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm tra health backend")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="URL gốc của backend (không có dấu / cuối)",
    )
    parser.add_argument("--metrics-token", default="", help="Token cho /metrics nếu đã bật")
    parser.add_argument("--timeout", type=float, default=10.0, help="Timeout mỗi request (giây)")
    parser.add_argument("--retries", type=int, default=3, help="Số lần thử lại")
    parser.add_argument("--retry-delay", type=float, default=3.0, help="Chờ giữa các lần thử (giây)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    targets = [
        ("health", f"{base}/health", ""),
        ("ready", f"{base}/health/ready", ""),
    ]
    if args.metrics_token:
        targets.append(("metrics", f"{base}/metrics", args.metrics_token))

    failed = []
    for name, url, token in targets:
        ok = False
        detail = ""
        for attempt in range(1, max(1, args.retries) + 1):
            ok, detail = check(url, token, args.timeout)
            if ok:
                break
            if attempt < args.retries:
                time.sleep(args.retry_delay)
        print(f"[{'OK' if ok else 'FAIL'}] {name:<8} {url} -> {detail}")
        if not ok:
            failed.append(name)

    if failed:
        print(f"Không đạt: {', '.join(failed)}", file=sys.stderr)
        raise SystemExit(1)
    print("Tất cả endpoint health đều đạt.")


if __name__ == "__main__":
    main()
