import hashlib
import hmac
import json
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, Security
from fastapi.concurrency import run_in_threadpool

from app.firebase_database import firebase_service
from app.core.config import settings
from app.models.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    ExtensionSessionRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
    ResetPasswordOtpRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    DeleteAccountRequest,
    RefreshTokenRequest,
    LogoutRequest,
)
from app.services.auth_service import auth_service
from app.services.email_service import email_service, render_otp_email
from app.core.dependencies import (
    auth_rate_limit,
    get_current_user,
    get_optional_user,
    heavy_rate_limit,
    user_public_data,
    logger,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Thông báo trung tính cho các luồng OTP, tránh lộ email có tồn tại hay không.
_RESET_OTP_MESSAGE = (
    "Nếu email đã được đăng ký, mã OTP đặt lại mật khẩu sẽ được gửi trong ít phút."
)
_VERIFY_OTP_MESSAGE = (
    "Nếu email cần xác minh, mã OTP mới sẽ được gửi trong ít phút."
)
_INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn."


def _ensure_active_user(user: dict) -> None:
    """Chặn tài khoản đã xoá mềm ở mọi luồng cấp lại phiên đăng nhập."""
    if auth_service.is_account_deleted(user):
        raise HTTPException(
            status_code=403,
            detail="Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.",
        )


def _is_production() -> bool:
    return settings.ENVIRONMENT.strip().lower() in {"production", "prod"}


def _require_email_configured(action: str) -> None:
    """Production không được tự kích hoạt tài khoản khi thiếu SMTP."""
    if email_service.configured():
        return
    if _is_production():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Hệ thống email chưa được cấu hình nên không thể {action}. "
                "Vui lòng liên hệ quản trị viên."
            ),
        )


def _otp_expiry_iso() -> str:
    return (
        datetime.now(timezone.utc) + timedelta(minutes=max(1, settings.OTP_TTL_MINUTES))
    ).isoformat()


def _otp_attempts_exhausted(user: dict, attempts_field: str) -> bool:
    return int(user.get(attempts_field) or 0) >= max(1, settings.OTP_MAX_ATTEMPTS)


def _record_failed_otp(
    user_ref,
    user: dict,
    attempts_field: str,
    otp_field: str,
    expires_field: str,
) -> int:
    """Tăng bộ đếm nhập sai; khi vượt ngưỡng thì vô hiệu hoá OTP hiện tại."""
    attempts = int(user.get(attempts_field) or 0) + 1
    updates = {attempts_field: attempts}
    if attempts >= max(1, settings.OTP_MAX_ATTEMPTS):
        updates[otp_field] = None
        updates[expires_field] = None
    user_ref.update(updates)
    return attempts


def _queue_otp_email(
    background_tasks: BackgroundTasks,
    user_ref,
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str,
    otp_field: str,
    expires_field: str,
    attempts_field: str,
) -> None:
    """Gửi OTP nền để thời gian phản hồi không phụ thuộc email có tồn tại."""

    def _send() -> None:
        try:
            email_service.send(to_email, subject, plain_body, html_body)
        except Exception as exc:  # pragma: no cover - phụ thuộc SMTP
            logger.error("Không gửi được email OTP: %s", exc)
            try:
                user_ref.update(
                    {otp_field: None, expires_field: None, attempts_field: 0}
                )
            except Exception:
                pass

    background_tasks.add_task(_send)


def _issue_auth_session(user: dict, user_ref) -> tuple[str, str]:
    """Cấp access token ngắn hạn và refresh token gắn với phiên trong Firestore."""
    session_id = auth_service.new_session_id()
    refresh_token = auth_service.create_refresh_token(user, session_id)
    sessions = auth_service.prune_refresh_sessions(user.get("refresh_sessions"))
    sessions.append(auth_service.build_refresh_session(refresh_token, session_id))
    sessions = auth_service.prune_refresh_sessions(sessions)
    user_ref.update({"refresh_sessions": sessions})
    return auth_service.create_token(user), refresh_token


def _session_payload(user: dict, user_ref, **extra) -> dict:
    token, refresh_token = _issue_auth_session(user, user_ref)
    payload = {
        "token": token,
        "refresh_token": refresh_token,
        "expires_in": max(1, settings.ACCESS_TOKEN_TTL_MINUTES) * 60,
        "user": user_public_data(user),
    }
    payload.update(extra)
    return payload


@router.post("/register")
async def register(request: RegisterRequest, _limit=Depends(auth_rate_limit)):
    email = auth_service.validate_gmail(request.email)
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng để tạo tài khoản.")

    user_id = hashlib.sha256(email.encode("utf-8")).hexdigest()
    user_ref = firebase_service.db.collection("users").document(user_id)
    existing_user = user_ref.get()
    if existing_user.exists:
        if auth_service.is_account_deleted(existing_user.to_dict() or {}):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Email này thuộc một tài khoản đã bị vô hiệu hoá. "
                    "Vui lòng liên hệ quản trị viên để khôi phục."
                ),
            )
        raise HTTPException(status_code=409, detail="Email này đã được đăng ký.")

    username = (request.display_name or email.split("@")[0]).strip()
    existing_username = list(firebase_service.db.collection("users").where("username", "==", username.lower()).limit(1).stream())
    if existing_username:
        raise HTTPException(status_code=409, detail="Tên đăng nhập này đã được sử dụng.")

    user = {
        "id": user_id,
        "username": username.lower(),
        "email": email,
        "display_name": username[:80],
        "password_hash": auth_service.hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "email_verified": False,
    }

    if not email_service.configured():
        if _is_production():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Hệ thống email xác minh chưa được cấu hình. "
                    "Vui lòng liên hệ quản trị viên để hoàn tất đăng ký."
                ),
            )
        user["email_verified"] = True
        user_ref.set(user)
        return _session_payload(
            user,
            user_ref,
            requires_verification=False,
            message="Đăng ký tài khoản thành công!",
        )

    otp = f"{random.randint(100000, 999999)}"
    user["verification_otp_hash"] = auth_service.hash_otp(otp, "register")
    user["verification_expires_at"] = _otp_expiry_iso()
    user["verification_otp_attempts"] = 0
    user["verification_otp"] = None
    user_ref.set(user, merge=True)
    plain_body, html_body = render_otp_email(otp, name=user["display_name"], purpose="register")
    try:
        await run_in_threadpool(
            email_service.send,
            email,
            "Mã xác minh (OTP) tài khoản Lecture AI",
            plain_body,
            html_body,
        )
        return {
            "requires_verification": True,
            "email": email,
            "message": "Đã gửi mã xác minh OTP qua email. Vui lòng kiểm tra hộp thư!",
        }
    except Exception as exc:
        logger.error("Không gửi được email xác minh cho %s: %s", email, exc)
        if _is_production():
            # Fail-closed: không giữ lại tài khoản chưa xác minh mà người dùng
            # không thể kích hoạt, tránh chiếm email và kẹt luồng đăng ký.
            try:
                user_ref.delete()
            except Exception as cleanup_exc:  # pragma: no cover - phòng thủ
                logger.warning("Không xoá được tài khoản đăng ký lỗi: %s", cleanup_exc)
            raise HTTPException(
                status_code=503,
                detail="Không thể gửi email xác minh lúc này. Vui lòng thử lại sau.",
            ) from exc
        logger.warning("Tự động kích hoạt tài khoản %s vì gửi email thất bại (môi trường phát triển).", email)
        user["email_verified"] = True
        user["verification_otp_hash"] = None
        user["verification_expires_at"] = None
        user_ref.set(user, merge=True)
        return _session_payload(
            user,
            user_ref,
            requires_verification=False,
            message="Đăng ký thành công (Hệ thống đã tự động kích hoạt tài khoản).",
        )


@router.post("/login")
async def login(request: LoginRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng để đăng nhập.")

    raw_ident = request.email.strip()
    user = None
    user_id = None

    # 1. Thử tìm bằng email nếu chuỗi có @
    if "@" in raw_ident:
        clean_email = auth_service.normalize_email(raw_ident)
        user_id = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
        user = auth_service.get_user(user_id)

    # 2. Thử tìm bằng username hoặc display_name
    if not user:
        clean_username = raw_ident.lower()
        matched = list(firebase_service.db.collection("users").where("username", "==", clean_username).limit(1).stream())
        if not matched:
            matched = list(firebase_service.db.collection("users").where("display_name", "==", raw_ident).limit(1).stream())
        if matched:
            user = matched[0].to_dict()
            user_id = user.get("id")

    # Luôn chạy PBKDF2 kể cả khi không tìm thấy tài khoản, tránh lộ sự tồn tại
    # của email/username qua thời gian phản hồi.
    stored_hash = (user or {}).get("password_hash") or auth_service.DUMMY_PASSWORD_HASH
    password_ok = auth_service.verify_password(request.password, stored_hash)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng.")

    _ensure_active_user(user)

    if user.get("email_verified") is False:
        if not email_service.configured():
            if _is_production():
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Tài khoản chưa xác minh email và hệ thống email đang chưa "
                        "sẵn sàng. Vui lòng liên hệ quản trị viên."
                    ),
                )
            user["email_verified"] = True
            if user_id:
                user_ref = firebase_service.db.collection("users").document(user_id)
                user_ref.update({"email_verified": True})
        else:
            raise HTTPException(status_code=403, detail="Hãy xác minh email trước khi đăng nhập.")

    return _session_payload(user, firebase_service.db.collection("users").document(user["id"]))


def _revoke_replayed_refresh_token(user: dict, session: dict, provided_hash: str) -> None:
    """Thu hồi toàn bộ phiên nếu refresh token cũ bị dùng lại ngoài grace period.

    Trong grace period, nhiều client (mobile + extension) có thể refresh gần như
    đồng thời; chỉ một yêu cầu thắng nên yêu cầu còn lại nhận 401 nhưng không bị
    đăng xuất. Nếu token cũ xuất hiện muộn hơn, coi là bị đánh cắp và thu hồi.
    """
    now = datetime.now(timezone.utc)
    for item in session.get("previous_hashes") or []:
        if not isinstance(item, dict):
            continue
        if not hmac.compare_digest(str(item.get("hash") or ""), provided_hash):
            continue
        try:
            rotated_at = datetime.fromisoformat(str(item.get("rotated_at")))
        except (TypeError, ValueError):
            rotated_at = None
        if rotated_at and (now - rotated_at).total_seconds() <= max(
            0, settings.REFRESH_REPLAY_GRACE_SECONDS
        ):
            return
        user_ref = firebase_service.db.collection("users").document(user["id"])
        user_ref.update({
            "token_version": auth_service.user_token_version(user) + 1,
            "refresh_sessions": [],
        })
        logger.warning(
            "Refresh token bị dùng lại ngoài grace period cho user %s; đã thu hồi toàn bộ phiên.",
            user.get("id"),
        )
        raise HTTPException(
            status_code=401,
            detail="Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.",
        )


@router.post("/refresh")
async def refresh_session(request: RefreshTokenRequest, _limit=Depends(auth_rate_limit)):
    """Đổi refresh token lấy access token mới, đồng thời xoay refresh token."""
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    claims = auth_service.decode_refresh_token(request.refresh_token)
    user = auth_service.get_user(claims.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    _ensure_active_user(user)
    if auth_service.user_token_version(user) != int(claims.get("ver") or 0):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.")

    sessions = auth_service.prune_refresh_sessions(user.get("refresh_sessions"))
    session = next((item for item in sessions if item.get("id") == claims.get("sid")), None)
    if not session:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.")
    provided_hash = auth_service.token_hash(request.refresh_token)
    if not hmac.compare_digest(
        str(session.get("hash") or ""),
        provided_hash,
    ):
        _revoke_replayed_refresh_token(user, session, provided_hash)
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ.")

    new_refresh_token = auth_service.create_refresh_token(user, claims["sid"])
    now = datetime.now(timezone.utc)
    history = [
        item for item in (session.get("previous_hashes") or [])
        if isinstance(item, dict)
    ]
    history.append({"hash": session.get("hash"), "rotated_at": now.isoformat()})
    session["previous_hashes"] = history[-5:]
    session["hash"] = auth_service.token_hash(new_refresh_token)
    session["rotated_at"] = now.isoformat()

    user_ref = firebase_service.db.collection("users").document(user["id"])
    user_ref.update({"refresh_sessions": sessions})
    return {
        "token": auth_service.create_token(user),
        "refresh_token": new_refresh_token,
        "expires_in": max(1, settings.ACCESS_TOKEN_TTL_MINUTES) * 60,
        "user": user_public_data(user),
    }


@router.post("/logout")
async def logout_session(
    request: LogoutRequest,
    _limit=Depends(auth_rate_limit),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Đăng xuất: thu hồi phiên hiện tại, hoặc toàn bộ phiên nếu ``revoke_all``."""
    if not firebase_service.db:
        firebase_service.init_firebase()

    if user and request.revoke_all and firebase_service.db:
        user_ref = firebase_service.db.collection("users").document(user["id"])
        user_ref.update({
            "token_version": auth_service.user_token_version(user) + 1,
            "refresh_sessions": [],
        })
        return {"message": "Đã đăng xuất khỏi tất cả thiết bị."}

    claims = None
    if request.refresh_token:
        try:
            claims = auth_service.decode_refresh_token(request.refresh_token)
        except HTTPException:
            claims = None

    if claims and firebase_service.db:
        try:
            user_ref = firebase_service.db.collection("users").document(claims["sub"])
            snapshot = user_ref.get()
            if snapshot.exists:
                current = snapshot.to_dict() or {}
                remaining = [
                    item for item in auth_service.prune_refresh_sessions(current.get("refresh_sessions"))
                    if item.get("id") != claims.get("sid")
                ]
                user_ref.update({"refresh_sessions": remaining})
        except Exception as exc:
            logger.warning("Không thu hồi được phiên đăng xuất: %s", exc)

    return {"message": "Đã đăng xuất."}


@router.post("/extension-session")
async def extension_session(request: ExtensionSessionRequest, _limit=Depends(auth_rate_limit)):
    """Cấp phiên riêng cho từng bản cài extension, không dùng tài khoản dùng chung.

    Client sinh một device_id ngẫu nhiên (VD: crypto.randomUUID()) và lưu cục bộ.
    Server ánh xạ device_id -> user ẩn, nhờ vậy mỗi bản cài có dữ liệu tách biệt
    và có thể thu hồi bằng cách xoá user tương ứng.
    """
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng để tạo phiên extension.")

    device_id = request.device_id.strip()
    digest = hashlib.sha256(f"extension:{device_id}".encode("utf-8")).hexdigest()
    user_id = f"ext_{digest[:40]}"
    user_ref = firebase_service.db.collection("users").document(user_id)
    doc = user_ref.get()

    if doc.exists:
        user = doc.to_dict()
        _ensure_active_user(user)
        if not user.get("id"):
            user["id"] = user_id
    else:
        user = {
            "id": user_id,
            "username": user_id,
            "email": f"{user_id}@extension.local",
            "display_name": "Extension User",
            "auth_provider": "extension",
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        user_ref.set(user)

    return _session_payload(user, user_ref)


@router.post("/verify-otp")
async def verify_otp(request: VerifyOtpRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    clean_email = auth_service.normalize_email(request.email)
    user_id = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    user_ref = firebase_service.db.collection("users").document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
    user = doc.to_dict()
    _ensure_active_user(user)
    if user.get("email_verified"):
        # Không cấp phiên ở đây: người dùng đã xác minh phải đăng nhập bằng
        # mật khẩu. Trước đây nhánh này trả token mà không kiểm tra OTP, cho
        # phép chiếm tài khoản chỉ với email.
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    if _otp_attempts_exhausted(user, "verification_otp_attempts"):
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    expires_at = user.get("verification_expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
        except ValueError:
            pass

    saved_otp = user.get("verification_otp_hash") or user.get("verification_otp") or ""
    if not auth_service.verify_otp(request.otp, saved_otp, "register"):
        _record_failed_otp(
            user_ref,
            user,
            "verification_otp_attempts",
            "verification_otp_hash",
            "verification_expires_at",
        )
        # Luôn trả cùng thông báo/status để không lộ email có tồn tại hay không.
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    user["email_verified"] = True
    user["verification_otp"] = None
    user["verification_otp_hash"] = None
    user["verification_expires_at"] = None
    user["verification_otp_attempts"] = 0
    user_ref.set(user, merge=True)
    return _session_payload(user, user_ref, message="Xác minh tài khoản thành công!")


@router.post("/resend-otp")
async def resend_otp(
    request: ResendOtpRequest,
    background_tasks: BackgroundTasks,
    _limit=Depends(auth_rate_limit),
):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    # Kiểm tra cấu hình email trước khi tra tài khoản để mọi email nhận cùng
    # một kết quả khi SMTP thiếu (tránh lộ email tồn tại).
    _require_email_configured("gửi lại mã xác minh")
    clean_email = auth_service.normalize_email(request.email)
    user_id = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    user_ref = firebase_service.db.collection("users").document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        return {"message": _VERIFY_OTP_MESSAGE}
    user = doc.to_dict()
    if auth_service.is_account_deleted(user) or user.get("email_verified"):
        return {"message": _VERIFY_OTP_MESSAGE}
    otp = f"{random.randint(100000, 999999)}"
    user_ref.update({
        "verification_otp": None,
        "verification_otp_hash": auth_service.hash_otp(otp, "register"),
        "verification_expires_at": _otp_expiry_iso(),
        "verification_otp_attempts": 0,
    })
    if not email_service.configured():
        logger.warning("[DEV MODE] Mã OTP xác minh cho %s là: %s", clean_email, otp)
        return {"message": _VERIFY_OTP_MESSAGE}
    plain_body, html_body = render_otp_email(otp, name=user.get("display_name", "Học viên"), purpose="register")
    _queue_otp_email(
        background_tasks,
        user_ref,
        clean_email,
        "Mã xác minh (OTP) tài khoản Lecture AI",
        plain_body,
        html_body,
        "verification_otp_hash",
        "verification_expires_at",
        "verification_otp_attempts",
    )
    return {"message": _VERIFY_OTP_MESSAGE}


@router.get("/verify-email")
async def verify_email(token: str = Query(..., min_length=20)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    matches = list(firebase_service.db.collection("users").where("verification_token_hash", "==", auth_service.token_hash(token)).limit(1).stream())
    if not matches:
        raise HTTPException(status_code=400, detail="Liên kết xác minh không hợp lệ hoặc đã hết hạn.")
    user_ref = matches[0].reference
    user = matches[0].to_dict()
    expires_at = user.get("verification_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Liên kết xác minh đã hết hạn.")
    user_ref.update({"email_verified": True, "verification_token_hash": None, "verification_expires_at": None})
    return {"verified": True, "email": user.get("email")}


@router.post("/ws-token")
async def create_ws_token(
    _: None = Depends(auth_rate_limit),
    user: dict = Depends(get_current_user)
):
    """Tạo token WebSocket ngắn hạn (1 giờ) cho luồng live stream.
    Sử dụng token hiện có của người dùng để tạo WS token mới (1 giờ)."""
    try:
        token = auth_service.create_ws_token(user)
        return {"token": token, "message": "Token WebSocket đã được tạo thành công"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Lỗi tạo token WebSocket: %s", exc)
        raise HTTPException(status_code=500, detail="Không thể tạo token WebSocket.")

@router.post("/google")
async def google_login(request: GoogleLoginRequest, _limit=Depends(auth_rate_limit)):
    google_user = auth_service.verify_google_id_token(request.id_token)
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    user_id = f"google_{google_user['provider_id']}"
    user_ref = firebase_service.db.collection("users").document(user_id)
    existing = user_ref.get()
    if existing.exists:
        _ensure_active_user(existing.to_dict() or {})
    user = existing.to_dict() if existing.exists else {
        "id": user_id,
        "email": google_user["email"],
        "display_name": google_user["display_name"],
        "avatar_url": google_user.get("avatar_url"),
        "auth_provider": "google",
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing.exists:
        user.update({"email": google_user["email"], "display_name": google_user["display_name"], "avatar_url": google_user.get("avatar_url")})
    user.setdefault("id", user_id)
    user_ref.set(user, merge=True)
    return _session_payload(user, user_ref)


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    _limit=Depends(auth_rate_limit),
):
    email = auth_service.validate_gmail(request.email)
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    # Kiểm tra cấu hình email trước khi tra tài khoản để mọi email nhận cùng
    # một kết quả khi SMTP thiếu (tránh lộ email tồn tại).
    _require_email_configured("gửi mã đặt lại mật khẩu")
    user_ref = firebase_service.db.collection("users").document(hashlib.sha256(email.encode("utf-8")).hexdigest())
    snapshot = user_ref.get()
    if not snapshot.exists:
        # Trả cùng thông báo với trường hợp thành công để tránh dò email.
        return {"message": _RESET_OTP_MESSAGE}

    user = snapshot.to_dict()
    if auth_service.is_account_deleted(user):
        # Tài khoản đã vô hiệu hoá phải được quản trị viên khôi phục trước.
        return {"message": _RESET_OTP_MESSAGE}
    otp = f"{random.randint(100000, 999999)}"
    user_ref.update({
        "reset_otp": None,
        "reset_otp_hash": auth_service.hash_otp(otp, "reset_password"),
        "reset_expires_at": _otp_expiry_iso(),
        "reset_otp_attempts": 0,
    })
    if not email_service.configured():
        logger.warning("[DEV MODE] Mã OTP đặt lại mật khẩu cho %s là: %s", email, otp)
        return {"message": _RESET_OTP_MESSAGE}
    plain_body, html_body = render_otp_email(otp, name=user.get("display_name", "Học viên"), purpose="reset_password")
    _queue_otp_email(
        background_tasks,
        user_ref,
        email,
        "Mã OTP đặt lại mật khẩu Lecture AI",
        plain_body,
        html_body,
        "reset_otp_hash",
        "reset_expires_at",
        "reset_otp_attempts",
    )
    return {"message": _RESET_OTP_MESSAGE}


@router.post("/verify-reset-otp")
async def verify_reset_otp(request: VerifyOtpRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    clean_email = auth_service.normalize_email(request.email)
    user_ref = firebase_service.db.collection("users").document(hashlib.sha256(clean_email.encode("utf-8")).hexdigest())
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
    user = doc.to_dict()
    if auth_service.is_account_deleted(user) or _otp_attempts_exhausted(user, "reset_otp_attempts"):
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    expires_at = user.get("reset_expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
        except ValueError:
            pass

    saved_otp = user.get("reset_otp_hash") or user.get("reset_otp") or ""
    if not auth_service.verify_otp(request.otp, saved_otp, "reset_password"):
        _record_failed_otp(
            user_ref,
            user,
            "reset_otp_attempts",
            "reset_otp_hash",
            "reset_expires_at",
        )
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    return {"valid": True, "message": "Xác nhận mã OTP thành công! Vui lòng nhập mật khẩu mới."}


@router.post("/reset-password-otp")
async def reset_password_otp(request: ResetPasswordOtpRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    clean_email = auth_service.normalize_email(request.email)
    user_ref = firebase_service.db.collection("users").document(hashlib.sha256(clean_email.encode("utf-8")).hexdigest())
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
    user = doc.to_dict()
    if auth_service.is_account_deleted(user) or _otp_attempts_exhausted(user, "reset_otp_attempts"):
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    expires_at = user.get("reset_expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)
        except ValueError:
            pass

    saved_otp = user.get("reset_otp_hash") or user.get("reset_otp") or ""
    if not auth_service.verify_otp(request.otp, saved_otp, "reset_password"):
        _record_failed_otp(
            user_ref,
            user,
            "reset_otp_attempts",
            "reset_otp_hash",
            "reset_expires_at",
        )
        raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

    new_hash = auth_service.hash_password(request.new_password)
    user_ref.update({
        "password_hash": new_hash,
        "reset_otp": None,
        "reset_otp_hash": None,
        "reset_expires_at": None,
        "reset_otp_attempts": 0,
        "email_verified": True,
        "token_version": auth_service.user_token_version(user) + 1,
        "refresh_sessions": [],
    })
    return {"message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    matches = list(firebase_service.db.collection("users").where("reset_token_hash", "==", auth_service.token_hash(request.token)).limit(1).stream())
    if not matches:
        raise HTTPException(status_code=400, detail="Token đặt lại mật khẩu không hợp lệ.")
    user_ref = matches[0].reference
    reset_user = matches[0].to_dict()
    _ensure_active_user(reset_user)
    expires_at = reset_user.get("reset_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token đặt lại mật khẩu đã hết hạn.")
    user_ref.update({
        "password_hash": auth_service.hash_password(request.password),
        "reset_token_hash": None,
        "reset_expires_at": None,
        "email_verified": True,
        "token_version": auth_service.user_token_version(reset_user) + 1,
        "refresh_sessions": [],
    })
    return {"reset": True, "message": "Đã cập nhật mật khẩu."}


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, user=Depends(get_current_user)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    if not auth_service.verify_password(request.old_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")

    if request.old_password == request.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại.")

    user_ref = firebase_service.db.collection("users").document(user["id"])
    new_hash = auth_service.hash_password(request.new_password)
    user_ref.update({
        "password_hash": new_hash,
        "token_version": auth_service.user_token_version(user) + 1,
        "refresh_sessions": [],
    })
    return {"message": "Đổi mật khẩu thành công! Vui lòng đăng nhập lại trên các thiết bị."}


@router.put("/profile")
async def update_profile(request: UpdateProfileRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    user_ref = firebase_service.db.collection("users").document(user["id"])
    current_user_doc = user_ref.get()
    current_data = current_user_doc.to_dict() if current_user_doc.exists else user

    updates = {}
    if request.display_name is not None:
        name = request.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Tên hiển thị không được để trống.")
        updates["display_name"] = name
        user["display_name"] = name

    if request.avatar is not None:
        updates["avatar"] = request.avatar
        user["avatar"] = request.avatar

    requires_email_otp = False
    pending_email = None

    if request.email is not None:
        clean_email = request.email.strip().lower()
        if not clean_email or "@" not in clean_email or "." not in clean_email:
            raise HTTPException(status_code=400, detail="Địa chỉ email không hợp lệ.")

        current_email = (current_data.get("email") or "").lower().strip()
        if clean_email != current_email:
            existing = list(firebase_service.db.collection("users").where("email", "==", clean_email).limit(1).stream())
            if existing and existing[0].id != user["id"]:
                raise HTTPException(status_code=409, detail="Địa chỉ email này đã được sử dụng bởi tài khoản khác.")

            if request.email_otp:
                if _otp_attempts_exhausted(current_data, "email_change_otp_attempts"):
                    raise HTTPException(
                        status_code=429,
                        detail="Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
                    )
                saved_pending = (current_data.get("pending_email") or "").strip().lower()
                exp_str = current_data.get("email_change_expires_at")

                if saved_pending != clean_email:
                    raise HTTPException(status_code=400, detail="Chưa có yêu cầu đổi sang email này hoặc mã đã hết hiệu lực.")

                if exp_str:
                    try:
                        exp_dt = datetime.fromisoformat(exp_str)
                        if exp_dt < datetime.now(timezone.utc):
                            raise HTTPException(status_code=400, detail="Mã OTP đổi email đã hết hạn. Vui lòng yêu cầu lại.")
                    except ValueError:
                        pass

                saved_otp = (
                    current_data.get("email_change_otp_hash")
                    or current_data.get("email_change_otp")
                    or ""
                )
                if not auth_service.verify_otp(request.email_otp, saved_otp, "change_email"):
                    _record_failed_otp(
                        user_ref,
                        current_data,
                        "email_change_otp_attempts",
                        "email_change_otp_hash",
                        "email_change_expires_at",
                    )
                    raise HTTPException(status_code=400, detail=_INVALID_OTP_MESSAGE)

                updates["email"] = clean_email
                updates["email_verified"] = True
                updates["pending_email"] = None
                updates["email_change_otp"] = None
                updates["email_change_otp_hash"] = None
                updates["email_change_otp_attempts"] = 0
                updates["email_change_expires_at"] = None
                user["email"] = clean_email
            else:
                _require_email_configured("gửi mã xác nhận đổi email")
                otp = f"{random.randint(100000, 999999)}"
                updates["pending_email"] = clean_email
                updates["email_change_otp"] = None
                updates["email_change_otp_hash"] = auth_service.hash_otp(otp, "change_email")
                updates["email_change_otp_attempts"] = 0
                updates["email_change_expires_at"] = _otp_expiry_iso()
                requires_email_otp = True
                pending_email = clean_email

                def _send_email_change_otp(body, html):
                    """Gửi OTP đổi email qua BackgroundTasks để không làm chậm API."""
                    try:
                        email_service.send(
                            clean_email,
                            "Mã OTP xác nhận thay đổi Email Lecture AI",
                            body, html,
                        )
                    except Exception as exc:
                        logger.error("Không gửi được email đổi email: %s", exc)
                        try:
                            user_ref.update({
                                "email_change_otp_hash": None,
                                "email_change_otp": None,
                                "email_change_expires_at": None,
                            })
                        except Exception:
                            pass

                if email_service.configured():
                    plain_body, html_body = render_otp_email(
                        otp,
                        name=user.get("display_name") or "Học viên",
                        purpose="change_email",
                    )
                    background_tasks.add_task(_send_email_change_otp, plain_body, html_body)
                else:
                    logger.warning("[DEV MODE] Mã OTP đổi email cho %s là: %s", clean_email, otp)

    if updates:
        user_ref.update(updates)

    if requires_email_otp:
        return {
            "requires_email_otp": True,
            "pending_email": pending_email,
            "message": f"Mã OTP 6 số đã được gửi tới {pending_email}. Vui lòng nhập mã để hoàn tất đổi email.",
            "user": user_public_data(user),
        }

    return {
        "message": "Cập nhật hồ sơ thành công!",
        "user": user_public_data(user),
    }


@router.get("/me")
async def get_profile(user=Depends(get_current_user)):
    lectures = []
    if firebase_service.db:
        try:
            lectures = list(firebase_service.db.collection("lectures").where("owner_id", "==", user["id"]).stream())
        except Exception as exc:
            logger.warning("Không lấy được thống kê tài khoản: %s", exc)
    return {
        "user": user_public_data(user),
        "stats": {
            "processed_lectures": len(lectures),
            "total_minutes": round(sum((doc.to_dict().get("duration_seconds") or 0) for doc in lectures) / 60),
            "saved_quizzes": sum(len(doc.to_dict().get("quiz") or []) for doc in lectures),
        },
    }


@router.get("/export-data")
async def export_account_data(
    user=Depends(get_current_user),
    _limit=Depends(heavy_rate_limit),
):
    """Xuất toàn bộ dữ liệu cá nhân dưới dạng JSON để người dùng lưu trữ."""
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    payload = firebase_service.export_user_data(user["id"])
    document = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": user_public_data(user),
        "lectures": payload.get("lectures", []),
        "media_owners": payload.get("media_owners", []),
    }
    body = json.dumps(document, ensure_ascii=False, indent=2, default=str)
    filename = f"lecture-ai-data-{user['id'][:8]}.json"
    return Response(
        content=body,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/account")
async def delete_account(
    request: DeleteAccountRequest,
    user=Depends(get_current_user),
    _limit=Depends(heavy_rate_limit),
):
    """Xoá tài khoản sau khi xác nhận mật khẩu, kèm toàn bộ dữ liệu liên quan."""
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")

    password_hash = user.get("password_hash") or ""
    if password_hash and not auth_service.verify_password(request.password or "", password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu xác nhận không đúng.")

    result = firebase_service.soft_delete_user_data(user["id"])
    if not result.get("deleted"):
        raise HTTPException(
            status_code=500,
            detail="Không thể vô hiệu hoá tài khoản. Vui lòng thử lại.",
        )

    return {
        "deleted": True,
        "soft": True,
        "message": (
            "Tài khoản đã được vô hiệu hoá. Dữ liệu bài giảng và media vẫn "
            "được lưu trữ để quản trị viên có thể khôi phục khi cần."
        ),
        "retained": {
            "lectures": result.get("lectures", 0),
            "media_owners": result.get("media_owners", 0),
        },
        "deleted_at": result.get("deleted_at"),
    }
