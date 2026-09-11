# BẢN ĐẶC TẢ THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX SPECIFICATION)
## Học phần: Phát triển Ứng dụng | Đại học Lạc Hồng

> **Đề tài:** Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng  
> **Sinh viên:** Võ Trần Minh Thắng & Vũ Đình Khánh Long  

---

## 1. SƠ ĐỒ ĐIỀU HƯỚNG MÀN HÌNH MOBILE APP (NAVIGATION FLOW)

```text
[ SPLASH / INTRO SCREEN ]
          │
          ▼
   [ HOME SCREEN ] 
    (Trang chủ: Nhập URL & Chọn chế độ)
          ├───► [ LIVE CAPTION SCREEN ] (Chế độ thu âm Micro trực tiếp tại lớp)
          │
          └───► [ SYNC PLAYER SCREEN ] (Trình xem video & Phụ đề đồng bộ)
                     │
                     ▼ (Bấm chuyển Tab)
                [ SUMMARY & QUIZ SCREEN ] (Bản tóm tắt ý chính & Trắc nghiệm ôn tập)
```

---

## 2. CHI TIẾT CÁC MÀN HÌNH TRÊN MOBILE APP (REACT NATIVE)

### 2.1. Màn hình 1: Trang chủ (Home Screen)
* **Mục đích:** Giúp sinh viên nhanh chóng đưa bài giảng vào xử lý hoặc bắt đầu nghe giảng trực tiếp.
* **Bố cục Wireframe:**
  ```text
  ┌──────────────────────────────────────────────┐
  │ 🎓 LECTURE AI CAPTION                ⚙️ (Settings)│
  ├──────────────────────────────────────────────┤
  │                                              │
  │ [ HỘP NHẬP LIÊN KẾT BÀI GIẢNG            ]   │
  │ ┌──────────────────────────────────────────┐ │
  │ │ 🔗 Dán đường dẫn YouTube, Drive, LMS...  │ │
  │ └──────────────────────────────────────────┘ │
  │ [ ⚡ BẮT ĐẦU TẠO PHỤ ĐỀ & TÓM TẮT (NÚT XANH) ] │
  │                                              │
  │ ─── HOẶC HỌC TẠI GIẢNG ĐƯỜNG TRỰC TIẾP ───   │
  │ ┌──────────────────────────────────────────┐ │
  │ │ 🎙️ BẬT LIVE-CAPTION QUA MICRO           │ │
  │ │ (Nhận diện lời thầy cô theo thời gian thực)│
  │ └──────────────────────────────────────────┘ │
  │                                              │
  │ 📚 BÀI GIẢNG ĐÃ XỬ LÝ GẦN ĐÂY:               │
  │ ┌──────────────────────────────────────────┐ │
  │ │ ▶️ Nhập môn Trí tuệ Nhân tạo - Bài 1    │ │
  │ │    Thời lượng: 45:10 | Đã có tóm tắt     │ │
  │ ├──────────────────────────────────────────┤ │
  │ │ ▶️ Kiến trúc Máy tính & Hệ điều hành     │ │
  │ │    Thời lượng: 60:20 | Phụ đề: Tiếng Việt│ │
  │ └──────────────────────────────────────────┘ │
  └──────────────────────────────────────────────┘
  ```

---

### 2.2. Màn hình 2: Trình phát & Phụ đề đồng bộ (Sync Player Screen)
* **Mục đích:** Vừa xem bài giảng vừa theo dõi phụ đề chạy khớp theo từng giây phát (như Spotify Lyrics).
* **Đặc tính tương tác:**
  * **Auto-scroll:** Danh sách phụ đề tự động cuộn theo tiến trình video.
  * **Interactive Subtitles:** Sinh viên bấm vào bất kỳ dòng phụ đề nào $\rightarrow$ Video sẽ tự động nhảy (seek) đến đúng giây đó.
* **Bố cục Wireframe:**
  ```text
  ┌──────────────────────────────────────────────┐
  │ ‹ Quay lại              [Tùy chọn phụ đề: VI]│
  ├──────────────────────────────────────────────┤
  │ ┌──────────────────────────────────────────┐ │
  │ │                                          │ │
  │ │          KHUNG PHÁT VIDEO / AUDIO        │ │
  │ │                                          │ │
  │ └──────────────────────────────────────────┘ │
  │ ── 04:15 ━━━━━━━━━━━━●──────── 45:10 ───     │
  │                 ⏮️   ⏯️   ⏭️                  │
  ├──────────────────────────────────────────────┤
  │ 💬 PHỤ ĐỀ ĐỒNG BỘ THỜI GIAN THỰC:            │
  │                                              │
  │    [04:00 - 04:10] Khái niệm về học máy      │ (chữ mờ)
  │                                              │
  │ ⭐ [04:10 - 04:25] "Chúng ta sử dụng mạng    │ ◄ ĐANG PHÁT
  │    nơ-ron nhân tạo để bóc tách đặc trưng"    │ (chữ to, sáng nổi bật)
  │                                              │
  │    [04:25 - 04:40] Bước tiếp theo là huấn    │ (chữ mờ)
  │    luyện mô hình với dữ liệu...              │
  ├──────────────────────────────────────────────┤
  │ [ Tab: Phụ đề (Đang chọn) ]  [ Tab: Tóm tắt ]│
  └──────────────────────────────────────────────┘
  ```

---

### 2.3. Màn hình 3: Tóm tắt bài giảng & Ôn tập (Summary & Quiz Screen)
* **Mục đích:** Ôn lại kiến thức cốt lõi trước kỳ thi chỉ trong 5 phút mà không cần xem lại cả video 1 tiếng.
* **Bố cục Wireframe:**
  ```text
  ┌──────────────────────────────────────────────┐
  │ 📑 TỔNG QUAN BÀI HỌC                         │
  ├──────────────────────────────────────────────┤
  │ 💡 Tóm tắt ngắn gọn:                         │
  │ Bài học tập trung vào 3 giải thuật phân lớp  │
  │ cơ bản và cách đánh giá độ chính xác mô hình.│
  │                                              │
  │ 📌 Các điểm kiến thức cốt lõi:               │
  │ • Định lý Bayes và xác suất có điều kiện      │
  │ • Ma trận nhầm lẫn (Confusion Matrix)        │
  │ • Chỉ số Precision, Recall và F1-Score        │
  │                                              │
  │ 📝 CÂU HỎI TRẮC NGHIỆM TỰ ÔN TẬP:            │
  │ Câu 1: Khi dữ liệu bị mất cân bằng, chỉ số   │
  │ nào đánh giá khách quan hơn Accuracy?        │
  │ [ ] A. Loss         [x] B. F1-Score          │
  │ [ ] C. Epoch        [ ] D. Learning rate     │
  │                                              │
  │ [ 📥 XUẤT FILE PDF TÀI LIỆU ÔN TẬP ]         │
  └──────────────────────────────────────────────┘
  ```

---

## 3. THIẾT KẾ TIỆN ÍCH TRÌNH DUYỆT (CHROME EXTENSION UI)

### 3.1. Popup Điều khiển (Extension Popup Window)
* Kích thước: `320px x 420px`.
* Tông màu: Dark Mode hiện đại (`#0f172a`), đổ bóng màu tím tím Neon (`#6366f1`).
* Thành phần:
  1. Trạng thái kết nối Server (`🟢 Đang kết nối Backend AI`).
  2. Chọn ngôn ngữ dịch (Tiếng Việt / English).
  3. Nút chính: **⚡ Bắt đầu tạo phụ đề cho Tab này**.
  4. Nút phụ: **Ẩn/Hiện lớp phủ phụ đề**.

### 3.2. Lớp phủ Phụ đề nổi (Floating Overlay Subtitle)
* **Vị trí:** Mặc định nằm ở 15% phía dưới khung video.
* **Hiệu ứng:** Kính mờ (Glassmorphism - `backdrop-filter: blur(8px)`), chữ trắng viền đen chống lóa khi khung hình video sáng.
* **Tính năng Drag & Drop:** Người dùng có thể bấm giữ chuột vào thanh phụ đề để kéo lên, kéo xuống hoặc di chuyển sang góc màn hình tùy ý.
