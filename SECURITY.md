# Chính sách bảo mật

## Phiên bản được hỗ trợ

| Thành phần | Phiên bản |
| :--- | :--- |
| Backend FastAPI | Nhánh `main` hiện tại |
| Mobile app (Expo SDK 57) | Bản phát hành mới nhất |
| Browser extension (MV3) | Bản phát hành mới nhất |

Các bản cũ không được vá bảo mật riêng; vui lòng cập nhật lên bản mới nhất.

## Báo cáo lỗ hổng

**Không mở issue công khai cho lỗ hổng bảo mật.** Gửi email tới
`[SECURITY_CONTACT_EMAIL]` với:

- mô tả lỗ hổng và mức ảnh hưởng;
- các bước tái hiện tối thiểu (request/response, log đã che dữ liệu nhạy cảm);
- phiên bản/commit đang chạy và môi trường (local, staging, production);
- thông tin liên hệ để phối hợp.

Chúng tôi cố gắng phản hồi trong **72 giờ** và sẽ công bố bản vá sau khi người
báo cáo đồng ý. Không đăng dữ liệu người dùng thật, khóa API, token hay file
service account trong báo cáo.

## Phạm vi

Trong phạm vi: backend API, xác thực/phiên, upload và proxy media, WebSocket,
browser extension, mobile app, cấu hình Docker/Caddy và workflow CI.

Ngoài phạm vi: tấn công từ chối dịch vụ quy mô lớn, lỗi do người dùng tự cấu
hình sai (ví dụ đặt `ALLOWED_HOSTS=*` ở production), dịch vụ bên thứ ba
(Firebase, Google, YouTube, nhà cung cấp email).

## Thực hành bắt buộc khi triển khai

1. Không commit `.env`, `serviceAccountKey.json`, cookie YouTube hay token.
2. `JWT_SECRET` ngẫu nhiên ≥ 32 ký tự; `ADMIN_TOKEN` ≥ 32 ký tự;
   `METRICS_TOKEN` ≥ 16 ký tự. Để trống hai token sau nếu không dùng.
3. Production bắt buộc HTTPS, `ALLOWED_HOSTS` và `CORS_ORIGINS` là domain cụ
   thể; đặt `API_BIND=127.0.0.1` khi chạy sau Caddy.
4. Dashboard `/admin` chỉ dùng qua HTTPS; không chia sẻ `ADMIN_TOKEN` và đăng
   xuất sau khi dùng xong. Token chỉ lưu trong `sessionStorage` của trình duyệt.
5. Nếu bật Redis queue, không mở cổng 6379 ra Internet và không đặt mật khẩu
   yếu. Redis chứa trạng thái job (tiêu đề, tiến độ, phụ đề tạm) nên cần được
   bảo vệ như dữ liệu nội bộ; dùng mạng Docker riêng hoặc `requirepass` + TLS.
6. Bật Dependabot, pip-audit, npm audit và Trivy trong CI (đã cấu hình sẵn).
7. Sao lưu Firestore + thư mục upload định kỳ, lưu offsite và **thử khôi phục**
   ít nhất mỗi quý.
8. Rà soát `firestore.rules` và không cấp quyền đọc trực tiếp cho client.
9. Giới hạn quyền service account Firebase theo nguyên tắc tối thiểu.
10. Che dữ liệu nhạy cảm trong log; dùng `LOG_FORMAT=json` khi đẩy vào hệ thống
    log tập trung.

## Câu hỏi

Mọi câu hỏi về quyền riêng tư: xem [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md)
và [`docs/TERMS_OF_SERVICE.md`](docs/TERMS_OF_SERVICE.md).
