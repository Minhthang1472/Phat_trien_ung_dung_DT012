import os
import sys

# Đảm bảo import được package ``app`` khi chạy pytest từ bất kỳ thư mục nào.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

# Cấu hình tối thiểu để các service bảo mật hoạt động trong môi trường test.
os.environ.setdefault("JWT_SECRET", "test-secret-" + "x" * 48)
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ALLOWED_HOSTS", "testserver")
os.environ.setdefault("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.test-missing.json")
