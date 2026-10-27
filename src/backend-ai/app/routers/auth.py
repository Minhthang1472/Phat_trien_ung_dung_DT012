import hashlib
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.firebase_database import firebase_service
from app.models.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
    ResetPasswordOtpRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from app.services.auth_service import auth_service
from app.services.email_service import email_service, render_otp_email
from app.core.dependencies import (
    auth_rate_limit,
    get_current_user,
    user_public_data,
    logger,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(request: RegisterRequest, _limit=Depends(auth_rate_limit)):
    email = auth_service.validate_gmail(request.email)
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng để tạo tài khoản.")

    user_id = hashlib.sha256(email.encode("utf-8")).hexdigest()
    user_ref = firebase_service.db.collection("users").document(user_id)
    if user_ref.get().exists:
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
        user["email_verified"] = True
        user_ref.set(user)
        token = auth_service.create_token(user)
        return {
            "token": token,
            "user": user_public_data(user),
            "requires_verification": False,
            "message": "Đăng ký tài khoản thành công!",
        }

    otp = f"{random.randint(100000, 999999)}"
    user["verification_otp"] = otp
    user["verification_expires_at"] = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
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
        logger.warning("Không gửi được email xác minh (%s), tự động kích hoạt tài khoản: %s", email, exc)
        user["email_verified"] = True
        user_ref.set(user)
        token = auth_service.create_token(user)
        return {
            "token": token,
            "user": user_public_data(user),
            "requires_verification": False,
            "message": "Đăng ký thành công (Hệ thống đã tự động kích hoạt tài khoản).",
        }


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

    if not user or not auth_service.verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng.")

    if user.get("email_verified") is False:
        if not email_service.configured():
            user["email_verified"] = True
            if user_id:
                user_ref = firebase_service.db.collection("users").document(user_id)
                user_ref.update({"email_verified": True})
        else:
            raise HTTPException(status_code=403, detail="Hãy xác minh email trước khi đăng nhập.")

    return {"token": auth_service.create_token(user), "user": user_public_data(user)}


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
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản với email này.")
    user = doc.to_dict()
    if user.get("email_verified"):
        token = auth_service.create_token(user)
        return {"token": token, "user": user_public_data(user), "message": "Tài khoản đã được xác minh trước đó."}

    saved_otp = str(user.get("verification_otp", "")).strip()
    if not saved_otp or saved_otp != request.otp.strip():
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác. Vui lòng kiểm tra lại.")

    expires_at = user.get("verification_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.")

    user["email_verified"] = True
    user["verification_otp"] = None
    user["verification_expires_at"] = None
    user_ref.set(user, merge=True)
    token = auth_service.create_token(user)
    return {"token": token, "user": user_public_data(user), "message": "Xác minh tài khoản thành công!"}


@router.post("/resend-otp")
async def resend_otp(request: ResendOtpRequest, _limit=Depends(auth_rate_limit)):
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    clean_email = auth_service.normalize_email(request.email)
    user_id = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    user_ref = firebase_service.db.collection("users").document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản với email này.")
    user = doc.to_dict()
    otp = f"{random.randint(100000, 999999)}"
    user_ref.update({
        "verification_otp": otp,
        "verification_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    })
    plain_body, html_body = render_otp_email(otp, name=user.get("display_name", "Học viên"), purpose="register")
    try:
        await run_in_threadpool(
            email_service.send,
            clean_email,
            "Mã xác minh (OTP) tài khoản Lecture AI",
            plain_body,
            html_body,
        )
        return {"message": "Đã gửi lại mã OTP mới vào hộp thư email!"}
    except Exception as exc:
        logger.error("Lỗi gửi lại mã OTP: %s", exc)
        raise HTTPException(status_code=503, detail="Không thể gửi email OTP lúc này. Vui lòng kiểm tra lại.") from exc


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
    user_ref.set(user, merge=True)
    return {"token": auth_service.create_token(user), "user": user_public_data(user)}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, _limit=Depends(auth_rate_limit)):
    email = auth_service.validate_gmail(request.email)
    if not firebase_service.db:
        firebase_service.init_firebase()
    if not firebase_service.db:
        raise HTTPException(status_code=503, detail="Firebase chưa sẵn sàng.")
    user_ref = firebase_service.db.collection("users").document(hashlib.sha256(email.encode("utf-8")).hexdigest())
    snapshot = user_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Email này chưa được đăng ký tài khoản.")

    user = snapshot.to_dict()
    otp = f"{random.randint(100000, 999999)}"
    user_ref.update({
        "reset_otp": otp,
        "reset_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    })
    plain_body, html_body = render_otp_email(otp, name=user.get("display_name", "Học viên"), purpose="reset_password")
    try:
        await run_in_threadpool(
            email_service.send,
            email,
            "Mã OTP đặt lại mật khẩu Lecture AI",
            plain_body,
            html_body,
        )
        return {"message": "Đã gửi mã OTP đặt lại mật khẩu qua email! Hãy kiểm tra hộp thư."}
    except Exception as exc:
        logger.error("Không gửi được email reset password OTP: %s", exc)
        raise HTTPException(status_code=503, detail="Không thể gửi email OTP lúc này. Vui lòng kiểm tra lại cấu hình email.") from exc


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
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    user = doc.to_dict()
    saved_otp = str(user.get("reset_otp", "")).strip()
    if not saved_otp or saved_otp != request.otp.strip():
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác.")

    expires_at = user.get("reset_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.")

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
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    user = doc.to_dict()
    saved_otp = str(user.get("reset_otp", "")).strip()
    if not saved_otp or saved_otp != request.otp.strip():
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác.")

    expires_at = user.get("reset_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.")

    new_hash = auth_service.hash_password(request.new_password)
    user_ref.update({
        "password_hash": new_hash,
        "reset_otp": None,
        "reset_expires_at": None,
        "email_verified": True,
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
    expires_at = reset_user.get("reset_expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token đặt lại mật khẩu đã hết hạn.")
    user_ref.update({"password_hash": auth_service.hash_password(request.password), "reset_token_hash": None, "reset_expires_at": None, "email_verified": True})
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
    user_ref.update({"password_hash": new_hash})
    return {"message": "Đổi mật khẩu thành công!"}


@router.put("/profile")
async def update_profile(request: UpdateProfileRequest, user=Depends(get_current_user)):
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
                saved_otp = str(current_data.get("email_change_otp") or "").strip()
                saved_pending = (current_data.get("pending_email") or "").strip().lower()
                exp_str = current_data.get("email_change_expires_at")

                if not saved_otp or saved_pending != clean_email:
                    raise HTTPException(status_code=400, detail="Chưa có yêu cầu đổi sang email này hoặc mã đã hết hiệu lực.")

                if exp_str:
                    try:
                        exp_dt = datetime.fromisoformat(exp_str)
                        if exp_dt < datetime.now(timezone.utc):
                            raise HTTPException(status_code=400, detail="Mã OTP đổi email đã hết hạn. Vui lòng yêu cầu lại.")
                    except ValueError:
                        pass

                if str(request.email_otp).strip() != saved_otp:
                    raise HTTPException(status_code=400, detail="Mã OTP xác thực email không chính xác.")

                updates["email"] = clean_email
                updates["email_verified"] = True
                updates["pending_email"] = None
                updates["email_change_otp"] = None
                updates["email_change_expires_at"] = None
                user["email"] = clean_email
            else:
                otp = f"{random.randint(100000, 999999)}"
                updates["pending_email"] = clean_email
                updates["email_change_otp"] = otp
                updates["email_change_expires_at"] = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
                requires_email_otp = True
                pending_email = clean_email

                if email_service.configured():
                    plain_body, html_body = render_otp_email(
                        otp,
                        name=user.get("display_name") or "Học viên",
                        purpose="change_email",
                    )
                    try:
                        await run_in_threadpool(
                            email_service.send,
                            clean_email,
                            "Mã OTP xác nhận thay đổi Email Lecture AI",
                            plain_body,
                            html_body,
                        )
                    except Exception as err:
                        logger.warning("Lỗi gửi email OTP đổi email: %s", err)
                else:
                    logger.info("[DEV MODE] Mã OTP đổi email cho %s là: %s", clean_email, otp)

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
