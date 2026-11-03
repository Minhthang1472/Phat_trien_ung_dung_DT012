import os
from ipaddress import ip_network

from dotenv import load_dotenv

# Thư mục gốc backend-ai (src/backend-ai), không phụ thuộc vào thư mục làm việc hiện tại
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

class Settings:
    PROJECT_NAME: str = "Lecture Caption & Summary AI"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    
    # AI Engine (Speech-to-Text & Local LLM)
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "small")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    # Access token ngắn hạn + refresh token dài hạn; client tự làm mới khi 401.
    ACCESS_TOKEN_TTL_MINUTES: int = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60"))
    REFRESH_TOKEN_TTL_DAYS: int = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))
    MAX_REFRESH_SESSIONS: int = int(os.getenv("MAX_REFRESH_SESSIONS", "5"))
    # Token ngắn hạn gắn vào URL media (/uploads/...). Đủ dài cho một buổi học,
    # mobile sẽ tự xin token mới trước khi hết hạn.
    MEDIA_TOKEN_TTL_MINUTES: int = int(os.getenv("MEDIA_TOKEN_TTL_MINUTES", "120"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    # OTP: thời hạn và số lần nhập sai tối đa trước khi buộc xin mã mới.
    OTP_TTL_MINUTES: int = int(os.getenv("OTP_TTL_MINUTES", "10"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    PUBLIC_API_URL: str = os.getenv("PUBLIC_API_URL", "http://127.0.0.1:8000")
    ALLOWED_VIDEO_HOSTS: list[str] = [
        host.strip().lower() for host in os.getenv(
            "ALLOWED_VIDEO_HOSTS", 
            "youtube.com,youtu.be,drive.google.com,drive.usercontent.google.com,docs.google.com,dropbox.com"
        ).split(",") if host.strip()
    ]
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:8081,http://localhost:19006").split(",") if origin.strip()
    ]
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    # Host header được phép. Ở production phải chỉ định domain cụ thể, không dùng '*'.
    ALLOWED_HOSTS: list[str] = [
        host.strip().lower()
        for host in os.getenv("ALLOWED_HOSTS", "*").split(",")
        if host.strip()
    ]
    # Danh sách IP/CIDR của reverse proxy tin cậy. Chỉ khi request đến từ các
    # địa chỉ này mới đọc X-Forwarded-For để lấy IP người dùng thật.
    TRUSTED_PROXIES: list[str] = [
        proxy.strip() for proxy in os.getenv("TRUSTED_PROXIES", "").split(",") if proxy.strip()
    ]
    # Bảo vệ /metrics. Để trống: tắt public metrics ở production.
    METRICS_TOKEN: str = os.getenv("METRICS_TOKEN", "")
    # Token cho API quản trị (/api/admin). Để trống: API quản trị trả 404.
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "")
    # Cho phép mở /docs ở production khi thật sự cần (mặc định tắt).
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "").strip().lower() in {"1", "true", "yes", "on"}
    # Giới hạn tài nguyên cho kênh Live-Caption WebSocket.
    WS_MAX_CONNECTIONS: int = int(os.getenv("WS_MAX_CONNECTIONS", "20"))
    WS_MAX_BUFFER_BYTES: int = int(os.getenv("WS_MAX_BUFFER_BYTES", str(5 * 1024 * 1024)))

    # Vận hành & dọn dẹp tài nguyên tạm
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    UPLOAD_TTL_HOURS: int = int(os.getenv("UPLOAD_TTL_HOURS", "24"))
    AUDIO_TEMP_TTL_HOURS: int = int(os.getenv("AUDIO_TEMP_TTL_HOURS", "6"))
    STREAM_JOB_TTL_MINUTES: int = int(os.getenv("STREAM_JOB_TTL_MINUTES", "120"))
    CLEANUP_INTERVAL_MINUTES: int = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "30"))

    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in {"production", "prod"}

    def validate(self) -> None:
        """Fail-fast khi cấu hình production thiếu hoặc không an toàn.

        Chỉ kiểm tra các giá trị bắt buộc, không log nội dung bí mật. Hàm được
        gọi trong lifespan để tiến trình không phục vụ với cấu hình nguy hiểm.
        """
        if not self.is_production():
            return

        problems: list[str] = []
        placeholder_secrets = {
            "replace_with_a_long_random_secret_at_least_32_chars",
            "replace_with_a_long_random_secret",
        }
        if len(self.JWT_SECRET) < 32 or self.JWT_SECRET.strip() in placeholder_secrets:
            problems.append("JWT_SECRET phải dài ít nhất 32 ký tự và không dùng giá trị mẫu")
        if not self.CORS_ORIGINS or "*" in self.CORS_ORIGINS:
            problems.append("CORS_ORIGINS phải chỉ định origin cụ thể, không dùng '*'")
        elif any(not origin.lower().startswith("https://") for origin in self.CORS_ORIGINS):
            problems.append("CORS_ORIGINS phải dùng HTTPS ở production")
        if not (self.SMTP_HOST and self.SMTP_USERNAME and self.SMTP_PASSWORD):
            problems.append("SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD là bắt buộc")
        if not self.PUBLIC_API_URL.lower().startswith("https://"):
            problems.append("PUBLIC_API_URL phải dùng HTTPS")
        if not self.ALLOWED_VIDEO_HOSTS:
            problems.append("ALLOWED_VIDEO_HOSTS không được rỗng")
        if not self.ALLOWED_HOSTS or "*" in self.ALLOWED_HOSTS:
            problems.append("ALLOWED_HOSTS phải chỉ định domain cụ thể, không dùng '*'")
        if self.METRICS_TOKEN and len(self.METRICS_TOKEN) < 16:
            problems.append("METRICS_TOKEN nếu đặt phải dài ít nhất 16 ký tự")
        if self.ADMIN_TOKEN and len(self.ADMIN_TOKEN) < 32:
            problems.append("ADMIN_TOKEN nếu đặt phải dài ít nhất 32 ký tự")
        for proxy in self.TRUSTED_PROXIES:
            try:
                network = ip_network(proxy, strict=False)
            except ValueError:
                problems.append(f"TRUSTED_PROXIES chứa giá trị không hợp lệ: {proxy}")
                continue
            if network.prefixlen == 0:
                problems.append(
                    "TRUSTED_PROXIES không được tin cậy toàn bộ Internet (0.0.0.0/0 hoặc ::/0)"
                )

        if problems:
            raise RuntimeError(
                "Cấu hình production chưa hợp lệ: " + "; ".join(problems)
            )


settings = Settings()
