# Chính sách quyền riêng tư

> **Mẫu tài liệu — cần luật sư/người phụ trách pháp lý rà soát trước khi công
> bố.** Thay mọi giá trị trong `[...]` bằng thông tin thật. Chính sách này phải
> khớp với dữ liệu ứng dụng thực tế thu thập và với biểu mẫu Data Safety của
> Google Play / App Privacy của App Store.

**Cập nhật lần cuối:** [DD/MM/YYYY]

[ TÊN ĐƠN VỊ / CÁ NHÂN ] (“chúng tôi”) vận hành ứng dụng **AI Lecture
Subtitle, Translation & Smart Summary** (“Ứng dụng”), gồm máy chủ AI, tiện ích
trình duyệt và ứng dụng di động. Chính sách này giải thích dữ liệu chúng tôi
thu thập, cách sử dụng và quyền của bạn.

## 1. Dữ liệu chúng tôi thu thập

### 1.1. Thông tin tài khoản

- Email, tên hiển thị, tên đăng nhập.
- Mật khẩu đã băm một chiều (PBKDF2-HMAC-SHA256) — chúng tôi **không** lưu mật
  khẩu gốc.
- Trạng thái xác minh email, thời điểm đăng nhập, phiên đăng nhập và mã làm
  mới phiên (dạng băm).
- Với đăng nhập Google: mã định danh tài khoản Google và email do Google trả
  về; chúng tôi không nhận mật khẩu Google.

### 1.2. Nội dung bài giảng và học tập

- URL video bài giảng, tiêu đề, thời lượng, ngôn ngữ.
- Phụ đề gốc và bản dịch, tóm tắt, sơ đồ tư duy, câu hỏi trắc nghiệm.
- File video/audio/phụ đề bạn tải lên và thời điểm xử lý.
- Lịch sử bài giảng, tiến độ học, điểm quiz (nếu có).

### 1.3. Dữ liệu kỹ thuật

- Địa chỉ IP, loại thiết bị/trình duyệt, thời điểm và mã yêu cầu (`X-Request-ID`),
  mã lỗi, thời lượng xử lý.
- Nhật ký bảo mật phục vụ chống lạm dụng (đăng nhập sai, giới hạn tần suất).
- Chúng tôi **không** thu thập vị trí chính xác, danh bạ, tin nhắn hay ảnh cá
  nhân ngoài nội dung bạn chủ động tải lên.

### 1.4. Âm thanh micro (Live-Caption)

Khi bạn bật tính năng phụ đề trực tiếp, âm thanh micro được truyền tới máy chủ
để nhận dạng giọng nói và trả phụ đề. Chúng tôi không lưu bản ghi âm lâu dài;
đoạn audio tạm được xoá theo chu kỳ dọn dẹp. Bạn có thể tắt/từ chối quyền micro
bất cứ lúc nào trong cài đặt thiết bị.

## 2. Mục đích sử dụng

- Cung cấp tính năng bóc tách phụ đề, dịch, tóm tắt, quiz và xuất tài liệu.
- Xác thực, bảo vệ tài khoản và chống gian lận/lạm dụng.
- Đồng bộ lịch sử giữa các thiết bị của cùng tài khoản.
- Khắc phục sự cố, đo hiệu năng và cải thiện chất lượng dịch vụ.
- Tuân thủ nghĩa vụ pháp lý và phản hồi yêu cầu hợp pháp.

Chúng tôi **không bán** dữ liệu cá nhân và không dùng nội dung bài giảng của
bạn để huấn luyện mô hình công khai.

## 3. Chia sẻ với bên thứ ba

Dữ liệu chỉ được chia sẻ ở mức cần thiết:

| Bên nhận | Mục đích | Dữ liệu |
| :--- | :--- | :--- |
| Google Firebase (Firestore) | Lưu tài khoản, lịch sử, media metadata | Dữ liệu tài khoản, bài giảng |
| Google Gemini API | Tóm tắt, sinh quiz từ phụ đề | Nội dung phụ đề/bài giảng |
| Google Translate | Dịch phụ đề | Nội dung phụ đề |
| YouTube/Google Drive/Dropbox | Tải video/audio theo URL bạn cung cấp | URL và luồng media |
| Nhà cung cấp SMTP | Gửi OTP/xác minh email | Email, mã OTP |
| Hạ tầng lưu trữ/hosting | Chạy máy chủ, sao lưu | Dữ liệu theo hợp đồng xử lý |

Các bên này có chính sách riêng; vui lòng đọc chính sách của Google và nhà
cung cấp hạ tầng. Chúng tôi không chia sẻ dữ liệu cho quảng cáo bên thứ ba.

## 4. Lưu trữ và xoá dữ liệu

- Dữ liệu tài khoản và bài giảng được lưu cho tới khi bạn xoá hoặc yêu cầu xoá.
- File media tải lên được dọn theo `UPLOAD_TTL_HOURS` (mặc định 24 giờ) trừ khi
  được giữ làm tài liệu học tập.
- Audio tạm cho Live-Caption được dọn theo `AUDIO_TEMP_TTL_HOURS`.
- Sao lưu hệ thống được giữ tối đa **[SỐ NGÀY] ngày** rồi xoá luân phiên.
- Khi bạn **vô hiệu hoá tài khoản**, ứng dụng thực hiện xoá mềm: tài khoản bị
  chặn đăng nhập nhưng dữ liệu học tập được giữ để có thể khôi phục. Bạn có
  thể liên hệ `[PRIVACY_CONTACT_EMAIL]` để yêu cầu xoá vĩnh viễn.
- Một số nhật ký bảo mật có thể được giữ lâu hơn để tuân thủ pháp luật.

## 5. Bảo mật

Chúng tôi dùng HTTPS, băm mật khẩu, token ngắn hạn, xoay refresh token, giới
hạn tần suất, kiểm soát truy cập Firestore và nguyên tắc quyền tối thiểu.
Không hệ thống nào an toàn tuyệt đối; hãy dùng mật khẩu mạnh và bảo vệ thiết
bị của bạn.

## 6. Quyền của bạn

Tùy khu vực pháp lý, bạn có quyền:

- truy cập và nhận bản sao dữ liệu (dùng **Xuất dữ liệu** trong ứng dụng);
- chỉnh sửa thông tin tài khoản;
- xoá tài khoản/dữ liệu (dùng **Vô hiệu hoá tài khoản** hoặc liên hệ);
- rút lại sự đồng ý (ví dụ tắt quyền micro);
- phản đối hoặc hạn chế xử lý trong một số trường hợp;
- khiếu nại với cơ quan bảo vệ dữ liệu có thẩm quyền.

Gửi yêu cầu tới `[PRIVACY_CONTACT_EMAIL]`; chúng tôi có thể cần xác minh danh
tính trước khi xử lý.

## 7. Trẻ em

Ứng dụng hướng tới người học từ **[ĐỘ TUỔI TỐI THIỂU]** tuổi trở lên. Chúng tôi
không cố ý thu thập dữ liệu trẻ em dưới độ tuổi này. Nếu phát hiện, hãy liên hệ
để chúng tôi xoá.

## 8. Chuyển dữ liệu quốc tế

Dịch vụ có thể xử lý dữ liệu trên máy chủ đặt ngoài quốc gia của bạn (ví dụ
Google Cloud). Chúng tôi áp dụng biện pháp bảo vệ phù hợp theo hợp đồng với nhà
cung cấp.

## 9. Thay đổi chính sách

Chúng tôi có thể cập nhật chính sách và sẽ đăng ngày hiệu lực mới. Thay đổi
quan trọng sẽ được thông báo trong ứng dụng hoặc qua email.

## 10. Liên hệ

[ TÊN ĐƠN VỊ ]
Địa chỉ: [ĐỊA CHỈ]
Email: [PRIVACY_CONTACT_EMAIL]
Điện thoại: [SỐ ĐIỆN THOẠI]
