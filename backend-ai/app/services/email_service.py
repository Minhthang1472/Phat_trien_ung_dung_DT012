import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings


def render_otp_email(otp: str, name: str = "Học viên", purpose: str = "register") -> tuple[str, str]:
    """Tạo template email xác thực / đặt lại mật khẩu chuẩn quốc tế cực đẹp theo thiết kế mẫu"""
    is_reset = purpose == "reset_password"
    title_en = "Your Lecture AI<br/><span style=\"color: #4f46e5;\">Password Reset Code</span>" if is_reset else "Your Lecture AI<br/><span style=\"color: #4f46e5;\">Verification Code</span>"
    hero_title = "Đặt lại mật khẩu tài khoản" if is_reset else "Xác minh tài khoản học viên"
    welcome_sub = (
        "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Lecture AI của mình. Nhập mã gồm 6 chữ số bên dưới để hoàn tất việc đổi mật khẩu mới."
        if is_reset
        else "Chào mừng bạn đến với Lecture AI! Cảm ơn bạn đã đồng hành cùng chúng tôi. Nhập mã gồm 6 chữ số bên dưới để hoàn tất xác minh tài khoản."
    )
    subject = "Mã OTP đặt lại mật khẩu Lecture AI" if is_reset else "Mã xác minh (OTP) tài khoản Lecture AI"

    plain_body = f"""Chào {name},

Mã xác thực Lecture AI của bạn là:
👉 {otp} 👈

{welcome_sub}
Mã này có hiệu lực trong 10 phút. Lecture AI sẽ không bao giờ yêu cầu bạn chia sẻ mã này với bất kỳ ai.

Nếu bạn không yêu cầu thao tác này, bạn có thể an tâm bỏ qua email này.

© 2026 Lecture AI. All rights reserved.
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Khung Email chính -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Top Header / Logo -->
          <tr>
            <td style="padding: 28px 30px 18px 30px; text-align: center;">
              <span style="font-size: 22px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px;">🎓 Lecture AI</span>
            </td>
          </tr>

          <!-- Hero Image Box với Gradient tím - hồng - cam như mẫu -->
          <tr>
            <td style="padding: 0 20px;">
              <div style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 40%, #f472b6 75%, #fb923c 100%); border-radius: 18px; padding: 36px 16px; text-align: center;">
                <!-- Thẻ trắng nổi bên trong Hero -->
                <div style="background-color: #ffffff; border-radius: 14px; padding: 26px 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); display: inline-block; width: 88%; max-width: 360px; box-sizing: border-box;">
                  <h1 style="margin: 0; font-family: 'Georgia', 'Playfair Display', serif; font-size: 22px; color: #1e3a8a; font-weight: 700; line-height: 1.35; letter-spacing: -0.3px;">
                    {title_en}
                  </h1>
                  <div style="width: 44px; height: 1.5px; background: #cbd5e1; margin: 16px auto 12px auto;"></div>
                  <div style="color: #64748b; font-size: 13px; font-weight: 600;">
                    {hero_title}<br/>
                    <span style="font-size: 18px; line-height: 22px;">↓</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Phần nội dung thân email -->
          <tr>
            <td style="padding: 28px 32px 24px 32px; text-align: left;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                Chào {name},
              </h2>
              <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                {welcome_sub}
              </p>

              <!-- Ô hiển thị mã OTP nổi bật -->
              <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 10px; text-align: center; margin: 0 0 22px 0;">
                <span style="font-family: 'SF Pro Mono', 'Menlo', 'Consolas', 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 12px; color: #0f172a; padding-left: 12px;">
                  {otp}
                </span>
              </div>

              <!-- Lưu ý thời hạn & Bảo mật -->
              <div style="margin-bottom: 22px; background-color: #faf5ff; border-radius: 12px; padding: 14px 16px; border: 1px solid #f3e8ff;">
                <p style="margin: 0 0 6px 0; font-size: 12.5px; color: #6b21a8; font-weight: 700;">
                  ⏳ Mã này có hiệu lực trong vòng 10 phút.
                </p>
                <p style="margin: 0 0 6px 0; font-size: 12.5px; color: #475569;">
                  🔒 Lecture AI sẽ không bao giờ yêu cầu bạn chia sẻ mã này với bất kỳ ai.
                </p>
                <p style="margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.5;">
                  Nếu bạn không yêu cầu mã này, bạn có thể an tâm bỏ qua email này. Tài khoản của bạn vẫn được bảo mật an toàn.
                </p>
              </div>

              <!-- Đường kẻ phân cách -->
              <div style="height: 1px; background-color: #e2e8f0; margin: 20px 0;"></div>

              <!-- Chân trang Footer -->
              <div style="text-align: center; font-size: 11.5px; color: #94a3b8; line-height: 1.8;">
                <span style="color: #64748b;">Chính sách bảo mật</span> &nbsp;•&nbsp; 
                <span style="color: #64748b;">Điều khoản dịch vụ</span> &nbsp;•&nbsp; 
                <span style="color: #64748b;">Hỗ trợ học viên</span>
                <br/>
                <strong style="color: #4f46e5;">🎓 Lecture AI Platform</strong>
                <br/>
                © 2026 Lecture AI. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return plain_body, html_body


class EmailService:
    @staticmethod
    def configured() -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD)

    @staticmethod
    def send(to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> None:
        if not EmailService.configured():
            raise RuntimeError("SMTP chưa được cấu hình.")
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
        message["To"] = to_email
        message.set_content(body)
        if html_body:
            message.add_alternative(html_body, subtype="html")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)


email_service = EmailService()