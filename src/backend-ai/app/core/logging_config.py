"""Định nghĩa logging thống nhất cho toàn bộ backend."""

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Cấu hình root logger để log có timestamp thay vì format mặc định.

    Uvicorn vẫn tự cấu hình logger riêng, nhưng các logger lấy qua
    ``logging.getLogger("uvicorn")`` và logger của thư viện sẽ kế thừa
    cấu hình này khi chưa có handler.
    """
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(level.upper())
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )
    root.addHandler(handler)
    root.setLevel(level.upper())
