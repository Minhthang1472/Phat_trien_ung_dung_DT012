"""Định nghĩa logging thống nhất cho toàn bộ backend."""

import json
import logging
import sys
from datetime import datetime, timezone


class JsonLogFormatter(logging.Formatter):
    """Format log thành một dòng JSON để đẩy vào hệ thống log tập trung."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO", log_format: str = "text") -> None:
    """Cấu hình root logger với timestamp và định dạng text/JSON.

    Uvicorn vẫn tự cấu hình logger riêng, nhưng các logger lấy qua
    ``logging.getLogger("uvicorn")`` và logger của thư viện sẽ kế thừa cấu
    hình này khi chưa có handler.
    """
    # Windows console mặc định dùng cp1252, không mã hoá được tiếng Việt.
    # Chuyển stdout/stderr sang UTF-8 khi có thể để log không bị mất dòng.
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            try:
                reconfigure(encoding="utf-8")
            except (OSError, ValueError):
                pass

    root = logging.getLogger()
    if root.handlers:
        root.setLevel(level.upper())
        return

    handler = logging.StreamHandler(sys.stdout)
    if (log_format or "text").strip().lower() == "json":
        handler.setFormatter(JsonLogFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
    root.addHandler(handler)
    root.setLevel(level.upper())
