# HƯỚNG DẪN CÀI ĐẶT & THỬ NGHIỆM TIỆN ÍCH TRÌNH DUYỆT (CHROME EXTENSION)

Tiện ích mở rộng **PHỤ ĐỀ BÀI GIẢNG AI** cho phép bạn xem bất kỳ bài giảng nào trên trình duyệt (YouTube, Google Drive, Coursera, LMS trường LHU...) và bóc tách phụ đề đồng bộ ngay trên video theo thời gian thực!

---

## 1. Cách cài đặt Extension vào Chrome / Cốc Cốc / Edge (Chỉ mất 30 giây)

1. Mở trình duyệt **Google Chrome** (hoặc **Microsoft Edge** / **Cốc Cốc**).
2. Nhập vào thanh địa chỉ:
   * Trên Chrome / Cốc Cốc: `chrome://extensions`
   * Trên Edge: `edge://extensions`
3. Ở góc trên bên phải màn hình, gạt công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** sang **BẬT (ON)**.
4. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
5. Chọn đúng thư mục:
   `c:\Users\thang\Desktop\Phát triển ứng dụng\browser-extension`
6. Tiện ích **PHỤ ĐỀ BÀI GIẢNG AI** sẽ xuất hiện trên thanh công cụ! (Bạn bấm vào biểu tượng mảnh ghép 🧩 trên góc phải trình duyệt để Ghim 📌 tiện ích ra ngoài).

---

## 2. Hướng dẫn thử nghiệm thực tế

1. **Khởi động Backend:** Đảm bảo Backend AI đang chạy ở cổng `http://127.0.0.1:8000`.
2. **Mở Video bài giảng:** Mở một tab YouTube bất kỳ (Ví dụ: một bài giảng tiếng Anh hoặc tiếng Nhật).
3. **Mở Tiện ích:** Bấm vào biểu tượng **PHỤ ĐỀ BÀI GIẢNG AI** trên thanh công cụ trình duyệt.
4. **Chọn tính năng mong muốn:**
   - **Cách 1 - Tạo toàn bộ bài giảng:** Chọn ngôn ngữ (Tiếng Việt) -> Bấm **"⚡ Bắt đầu tạo phụ đề AI"**. Hệ thống sẽ tự động bóc tách, dịch phụ đề, tóm tắt bài học và sinh câu hỏi trắc nghiệm!
   - **Cách 2 - Đệm tức thì 15s:** Bấm **"⏩ Đệm nhanh 15s"** để nhận diện ngay đoạn đang phát mà không cần chờ toàn bộ video.
   - **Cách 3 - Nạp file phụ đề:** Chọn file `.srt` hoặc `.vtt` từ máy tính và bấm **"Dịch & Nạp vào Video"**.
5. **Trải nghiệm phụ đề nổi trên Video:**
   - Phụ đề song ngữ sẽ nổi trực tiếp trên video.
   - Bạn có thể **dùng chuột kéo thả** thanh phụ đề đến vị trí bất kỳ.
   - Khi rê chuột vào thanh phụ đề, có các nút: **A- / A+** (chỉnh cỡ chữ), **🌐** (bật/tắt song ngữ), **✕** (ẩn phụ đề).
   - **Hỗ trợ Toàn màn hình (Fullscreen):** Khi bạn bấm phóng to toàn màn hình trên YouTube, phụ đề vẫn hiển thị mượt mà không bị che khuất!
