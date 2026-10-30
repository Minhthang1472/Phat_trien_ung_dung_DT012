import hashlib
import hmac
import os
import secrets
from typing import Any, Dict, Optional
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status

from app.core.config import settings
from app.firebase_database import firebase_service


class AuthService:
    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def validate_gmail(email: str) -> str:
        normalized = AuthService.normalize_email(email)
        import re
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized):
            raise HTTPException(status_code=400, detail="Vui lòng dùng địa chỉ email hợp lệ.")
        return normalized

    @staticmethod
    def hash_password(password: str, salt: Optional[bytes] = None) -> str:
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 8 ký tự.")
        salt = salt or os.urandom(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 240_000)
        return f"pbkdf2_sha256$240000${salt.hex()}${digest.hex()}"

    @staticmethod
    def verify_password(password: str, stored: str) -> bool:
        try:
            algorithm, rounds, salt_hex, digest_hex = stored.split("$", 3)
            if algorithm != "pbkdf2_sha256":
                return False
            digest = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
            )
            return hmac.compare_digest(digest.hex(), digest_hex)
        except (ValueError, TypeError):
            return False

    @staticmethod
    def create_token(user: Dict[str, Any]) -> str:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        payload = {
            "sub": user["id"],
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS),
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        try:
            return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
            ) from exc

    @staticmethod
    def create_media_token(user_id: str, media_url: str) -> str:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        return jwt.encode({
            "sub": user_id,
            "media_url": media_url,
            "type": "media",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        }, settings.JWT_SECRET, algorithm="HS256")

    @staticmethod
    def decode_media_token(token: str) -> Dict[str, Any]:
        claims = auth_service.decode_token(token)
        if claims.get("type") != "media" or not claims.get("media_url"):
            raise HTTPException(status_code=401, detail="Media token không hợp lệ.")
        return claims

    @staticmethod
    def create_ws_token(user: Dict[str, Any]) -> str:
        """Tạo WebSocket token ngắn hạn (1 giờ) dùng cho luồng live stream."""
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        payload = {
            "sub": user["id"],
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "ws",
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    @staticmethod
    def get_user(user_id: str) -> Optional[Dict[str, Any]]:
        if not firebase_service.db:
            firebase_service.init_firebase()
        if not firebase_service.db:
            return None
        doc = firebase_service.db.collection("users").document(user_id).get()
        return doc.to_dict() if doc.exists else None

    @staticmethod
    def new_email_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_google_id_token(id_token: str) -> Dict[str, Any]:
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_ID chưa được cấu hình.")
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            claims = google_id_token.verify_oauth2_token(
                id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Google ID token không hợp lệ.") from exc
        email = AuthService.validate_gmail(claims.get("email", ""))
        if not claims.get("email_verified"):
            raise HTTPException(status_code=403, detail="Tài khoản Google chưa được xác minh email.")
        return {
            "provider_id": claims.get("sub"),
            "email": email,
            "display_name": claims.get("name") or email.split("@")[0],
            "avatar_url": claims.get("picture"),
        }


auth_service = AuthService()