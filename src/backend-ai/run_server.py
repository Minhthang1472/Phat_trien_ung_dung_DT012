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
    print(f"Đang khởi chạy Backend AI Server tại: http://{settings.HOST}:{settings.PORT}")
    print(f"Swagger API Docs tại: http://{settings.HOST}:{settings.PORT}/docs")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True, reload_dirs=[BASE_DIR])
