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
    # Hash giả dùng khi không tìm thấy tài khoản, để thời gian phản hồi login
    # tương đương trường hợp sai mật khẩu và không lộ email/username tồn tại.
    DUMMY_PASSWORD_HASH = (
        "pbkdf2_sha256$240000$"
        + ("0" * 32)
        + "$"
        + ("0" * 64)
    )

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
    def user_token_version(user: Dict[str, Any]) -> int:
        try:
            return int(user.get("token_version") or 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def create_token(user: Dict[str, Any]) -> str:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        payload = {
            "sub": user["id"],
            "email": user["email"],
            "type": "access",
            "ver": AuthService.user_token_version(user),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=max(1, settings.ACCESS_TOKEN_TTL_MINUTES)),
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    @staticmethod
    def decode_access_token(token: str) -> Dict[str, Any]:
        claims = auth_service.decode_token(token)
        # Token cũ chưa có ``type`` vẫn được chấp nhận trong giai đoạn nâng cấp.
        if claims.get("type") not in (None, "access"):
            raise HTTPException(status_code=401, detail="Token không phải access token.")
        return claims

    @staticmethod
    def new_session_id() -> str:
        return secrets.token_urlsafe(18)

    @staticmethod
    def build_refresh_session(refresh_token: str, session_id: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "id": session_id,
            "hash": AuthService.token_hash(refresh_token),
            "created_at": now.isoformat(),
            "expires_at": (
                now + timedelta(days=max(1, settings.REFRESH_TOKEN_TTL_DAYS))
            ).isoformat(),
        }

    @staticmethod
    def create_refresh_token(user: Dict[str, Any], session_id: str) -> str:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        payload = {
            "sub": user["id"],
            "type": "refresh",
            "sid": session_id,
            "jti": secrets.token_urlsafe(12),
            "ver": AuthService.user_token_version(user),
            "exp": datetime.now(timezone.utc) + timedelta(days=max(1, settings.REFRESH_TOKEN_TTL_DAYS)),
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    @staticmethod
    def decode_refresh_token(token: str) -> Dict[str, Any]:
        claims = auth_service.decode_token(token)
        if claims.get("type") != "refresh" or not claims.get("sid"):
            raise HTTPException(status_code=401, detail="Refresh token không hợp lệ.")
        return claims

    @staticmethod
    def prune_refresh_sessions(sessions: Any) -> list:
        """Bỏ phiên hết hạn/không hợp lệ và giới hạn số phiên mỗi tài khoản."""
        now = datetime.now(timezone.utc)
        valid = []
        for session in sessions or []:
            if not isinstance(session, dict):
                continue
            if not session.get("id") or not session.get("hash"):
                continue
            expires_at = session.get("expires_at")
            if expires_at:
                try:
                    if datetime.fromisoformat(str(expires_at)) < now:
                        continue
                except (TypeError, ValueError):
                    continue
            valid.append(session)
        return valid[-max(1, settings.MAX_REFRESH_SESSIONS):]

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
    def create_media_token(user_id: str, media_url: str, token_version: int = 0) -> str:
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        return jwt.encode({
            "sub": user_id,
            "media_url": media_url,
            "type": "media",
            # Gắn token_version để media token cũng bị thu hồi khi đổi mật khẩu
            # hoặc đăng xuất toàn bộ phiên.
            "ver": int(token_version or 0),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=max(1, settings.MEDIA_TOKEN_TTL_MINUTES)),
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
            "ver": AuthService.user_token_version(user),
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
    def is_account_deleted(user: Optional[Dict[str, Any]]) -> bool:
        """Tài khoản đã bị xoá mềm (vô hiệu hoá) hay chưa.

        Dữ liệu vẫn được giữ trong Firestore để quản trị viên có thể khôi phục;
        chỉ các luồng đăng nhập/phiên hiện tại bị chặn.
        """
        if not user:
            return False
        return bool(
            user.get("deleted")
            or user.get("deleted_at")
            or user.get("account_status") == "deleted"
        )

    @staticmethod
    def new_email_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_otp(otp: str, purpose: str = "verification") -> str:
        """Băm OTP bằng HMAC-SHA256 với JWT_SECRET để không lưu plaintext."""
        if len(settings.JWT_SECRET) < 32:
            raise HTTPException(status_code=503, detail="JWT_SECRET chưa được cấu hình an toàn trên server.")
        digest = hmac.new(
            settings.JWT_SECRET.encode("utf-8"),
            f"{purpose}:{str(otp).strip()}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return f"hmac_sha256${digest}"

    @staticmethod
    def verify_otp(otp: str, stored: str, purpose: str = "verification") -> bool:
        """So khớp OTP với giá trị đã băm; hỗ trợ tạm giá trị plaintext cũ."""
        stored = str(stored or "").strip()
        if not stored:
            return False
        if stored.startswith("hmac_sha256$"):
            try:
                expected = AuthService.hash_otp(otp, purpose)
            except HTTPException:
                return False
            return hmac.compare_digest(stored, expected)
        # Tương thích ngược với OTP plaintext còn hiệu lực trong lúc nâng cấp.
        return hmac.compare_digest(stored, str(otp).strip())

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