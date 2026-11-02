import os
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
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "168"))
    # Token ngắn hạn gắn vào URL media (/uploads/...). Đủ dài cho một buổi học,
    # mobile sẽ tự xin token mới trước khi hết hạn.
    MEDIA_TOKEN_TTL_MINUTES: int = int(os.getenv("MEDIA_TOKEN_TTL_MINUTES", "120"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    PUBLIC_API_URL: str = os.getenv("PUBLIC_API_URL", "http://127.0.0.1:8000")
    ALLOWED_VIDEO_HOSTS: list[str] = [
        host.strip().lower() for host in os.getenv(
            "ALLOWED_VIDEO_HOSTS", 
            "youtube.com,youtu.be,drive.google.com,docs.google.com,dropbox.com"
        ).split(",") if host.strip()
    ]
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:8081,http://localhost:19006").split(",") if origin.strip()
    ]
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Vận hành & dọn dẹp tài nguyên tạm
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    UPLOAD_TTL_HOURS: int = int(os.getenv("UPLOAD_TTL_HOURS", "24"))
    STREAM_JOB_TTL_MINUTES: int = int(os.getenv("STREAM_JOB_TTL_MINUTES", "120"))
    CLEANUP_INTERVAL_MINUTES: int = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "30"))

settings = Settings()
