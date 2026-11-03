import os
import sys

# Đảm bảo import "app.*" hoạt động dù chạy script từ bất kỳ thư mục nào
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import uvicorn
from app.core.config import settings

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

if __name__ == "__main__":
    is_dev = settings.ENVIRONMENT.strip().lower() in {"development", "dev", "test"}
    print(f"Đang khởi chạy Backend AI Server tại: http://{settings.HOST}:{settings.PORT}")
    if settings.ENABLE_DOCS or not settings.is_production():
        print(f"Swagger API Docs tại: http://{settings.HOST}:{settings.PORT}/docs")
    # Chỉ bật auto-reload khi phát triển; production chạy tiến trình ổn định.
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=is_dev,
        reload_dirs=[BASE_DIR] if is_dev else None,
        # Chunk audio live thường ~64KB; giới hạn 1MB tránh frame quá lớn.
        ws_max_size=1024 * 1024,
        ws_ping_interval=20,
        ws_ping_timeout=20,
    )
