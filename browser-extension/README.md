# HƯỚNG DẪN CÀI ĐẶT & CHẠY THỬ NGHIỆM TIỆN ÍCH TRÌNH DUYỆT (BROWSER EXTENSION)

Tiện ích này cho phép bạn mở bất kỳ video bài giảng nào trên trình duyệt (YouTube, Coursera, LMS trường...), bấm 1 nút là hệ thống sẽ tự bóc tách phụ đề và hiển thị phụ đề nổi đè lên video.

---

## 1. Cách cài đặt Extension vào Chrome / Microsoft Edge
1. Mở trình duyệt Chrome hoặc Edge.
2. Truy cập vào trang quản lý tiện ích:
   * Trên Chrome: gõ `chrome://extensions` vào thanh địa chỉ.
   * Trên Edge: gõ `edge://extensions` vào thanh địa chỉ.
3. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
4. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục: `c:\Users\thang\Desktop\Phát triển ứng dụng\browser-extension`.
6. Biểu tượng **AI Lecture Caption** sẽ xuất hiện trên thanh công cụ trình duyệt!

---

## 2. Cách sử dụng
1. Đảm bảo Backend AI Server đang bật (`python run_server.py` ở cổng 8000).
2. Mở một tab xem video bài giảng bất kỳ (ví dụ một video trên YouTube).
3. Bấm vào icon tiện ích **AI Lecture Caption** trên thanh công cụ.
4. Bấm nút **"⚡ Bắt đầu tạo phụ đề cho Tab này"**.
5. Phụ đề có mốc thời gian sẽ xuất hiện trực tiếp ngay trên khung video! Bạn có thể dùng chuột kéo thả thanh phụ đề đến vị trí tùy thích.
