# HỆ THỐNG TỰ ĐỘNG TÓM TẮT VÀ ĐỒNG BỘ PHỤ ĐỀ ĐA NGÔN NGỮ CHO VIDEO BÀI GIẢNG
### (AI Lecture Subtitle & Summary System)

> **Học phần:** Phát triển Ứng dụng  
> **Trường:** Đại học Lạc Hồng (LHU) - Khoa Công nghệ Thông tin  
> **Giảng viên hướng dẫn:** ThS. Phan Mạnh Thường  
> **Nhóm sinh viên thực hiện:**
> 1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)  
> 2. **Vũ Đình Khánh Long** (MSSV: `123001217` - Thành viên)  

---

## 📖 GIỚI THIỆU DỰ ÁN

Trong thời đại số hóa giáo dục, video bài giảng trực tuyến (đặc biệt trên YouTube) là nguồn tri thức vô cùng phong phú. Tuy nhiên, sinh viên và người tự học thường gặp các rào cản lớn:
- **Rào cản ngôn ngữ:** Rất nhiều bài giảng chất lượng cao của các trường đại học quốc tế chỉ có tiếng Anh hoặc thiếu phụ đề chuẩn xác.
- **Tốn nhiều thời gian theo dõi:** Video bài giảng dài từ 45 - 90 phút gây khó khăn trong việc nắm bắt trọng tâm nếu không có bản tóm tắt tóm lược.
- **Thiếu công cụ ôn tập tức thì:** Người học không có câu hỏi trắc nghiệm kiểm tra mức độ hiểu bài ngay sau khi nghe giảng.

**Hệ thống AI Lecture Subtitle & Summary** ra đời nhằm giải quyết triệt để các khó khăn trên bằng việc ứng dụng trí tuệ nhân tạo (AI):
1. **Bóc tách âm thanh & tạo phụ đề song ngữ:** Ứng dụng mô hình **OpenAI Whisper ASR** nhận diện chính xác từng câu nói có gán mốc thời gian (timestamps) và dịch song ngữ (Anh - Việt / Việt - Anh).
2. **Tự động tóm tắt bài giảng:** Mô hình ngôn ngữ tự nhiên (NLP/Gemini) rút trích ý chính, nội dung trọng tâm và kết luận của buổi học.
3. **Sinh câu hỏi trắc nghiệm tự động (Quiz):** Tạo ngân hàng câu hỏi ôn tập kèm đáp án và giải thích chi tiết giúp người học củng cố kiến thức.
4. **Hệ sinh thái đa nền tảng linh hoạt:** Tích hợp **Tiện ích mở rộng trình duyệt (Browser Extension)** chạy trực tiếp trên YouTube và **Ứng dụng di động / Web App (React Native - Expo)** cho trải nghiệm học tập mọi lúc, mọi nơi.

---

## 🏛️ KIẾN TRÚC & CẤU TRÚC THƯ MỤC

```text
Phát triển ứng dụng/
├── backend-ai/               # Máy chủ Backend AI & REST API
│   ├── app/
│   │   ├── main.py           # FastAPI endpoints (Auth, ASR, Summary, Quiz, Sync)
│   │   ├── asr/              # Pipeline nhận diện Whisper, tách audio, timestamps
│   │   ├── nlp/              # Xử lý tóm tắt & sinh câu hỏi trắc nghiệm AI
│   │   └── firebase_db.py    # Kết nối Google Firebase Cloud Firestore
│   ├── poc_test.py           # Script chạy thử nghiệm bóc tách video độc lập
│   ├── run_server.py         # Entry point khởi chạy máy chủ FastAPI (Port 8000)
│   └── requirements.txt      # Thư viện Python phụ thuộc
│
├── browser-extension/        # Tiện ích mở rộng Chrome/Edge (Manifest V3)
│   ├── manifest.json         # Cấu hình tiện ích mở rộng V3
│   ├── popup.html / popup.js # Bảng điều khiển tác vụ nhanh khi bấm icon
│   ├── content.js            # Script can thiệp và chèn phụ đề song ngữ vào YouTube
│   └── overlay.css           # Giao diện phụ đề và bảng tóm tắt nổi trên video
│
├── mobile-app/               # Ứng dụng Di động & Web App (React Native / Expo)
│   ├── src/
│   │   ├── screens/          # Các màn hình chính (HomeScreen, ProfileScreen, SettingsScreen)
│   │   ├── components/       # Header, LecturePlayer, SubtitleView, QuizView, SummaryView
│   │   ├── services/api.js   # Service gọi API Backend, đồng bộ Firestore, bộ nhớ Cache
│   │   └── constants/theme.js# Hệ màu Dark Theme hiện đại, chuẩn thẩm mỹ
│   ├── package.json          # Danh sách thư viện React Native & Expo SDK 52/53
│   └── App.js                # Điều hướng ứng dụng đa tab (Bài giảng, Hồ sơ, Cài đặt)
│
└── docs/                     # Toàn bộ hồ sơ báo cáo học thuật & thiết kế dự án
```

---

## 🛠️ YÊU CẦU MÔI TRƯỜNG CẦN CÓ

Trước khi cài đặt, hãy đảm bảo máy tính đã cài đặt các công cụ sau:
- **Node.js:** Phiên bản `18.x` hoặc `20.x` LTS ([Tải về tại nodejs.org](https://nodejs.org/))
- **Python:** Phiên bản `3.10` hoặc `3.11` ([Tải về tại python.org](https://www.python.org/))
- **FFmpeg:** Cần thiết cho xử lý âm thanh video ([Tải FFmpeg](https://ffmpeg.org/download.html) hoặc cài qua `winget install Gyan.FFmpeg` trên Windows)
- **Trình duyệt Web:** Google Chrome, Microsoft Edge, Brave hoặc Cốc Cốc.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY CHI TIẾT

### PHẦN 1: CÀI ĐẶT & BẬT BACKEND AI (`backend-ai`)

1. **Mở terminal (PowerShell hoặc Command Prompt) và chuyển vào thư mục backend:**
   ```powershell
   cd "backend-ai"
   ```

2. **Tạo và kích hoạt môi trường ảo Python (Virtual Environment):**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```

3. **Cài đặt các gói thư viện phụ thuộc:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Cấu hình biến môi trường (`.env`):**
   Đảm bảo file `.env` trong thư mục `backend-ai` có các thông số kết nối (Firebase, Gemini API Key, JWT Secret). Mẫu cơ bản:
   ```env
   PORT=8000
   FIREBASE_CREDENTIALS=path_to_firebase_credentials.json
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET_KEY=your_super_secret_key
   ```

5. **Khởi chạy máy chủ API:**
   ```powershell
   python run_server.py
   ```
   * Máy chủ sẽ chạy tại địa chỉ: **`http://127.0.0.1:8000`**
   * Xem tài liệu API tương tác (Swagger UI) tại: **`http://127.0.0.1:8000/docs`**

---

### PHẦN 2: CÀI ĐẶT TIỆN ÍCH TRÌNH DUYỆT (`browser-extension`)

Tiện ích hoạt động trên tất cả trình duyệt nền Chromium như **Google Chrome**, **Microsoft Edge**, **Brave**, **Cốc Cốc**:

1. Mở trình duyệt, truy cập vào trang quản lý tiện ích:
   * **Chrome / Brave / Cốc Cốc:** Nhập thanh địa chỉ `chrome://extensions`
   * **Microsoft Edge:** Nhập thanh địa chỉ `edge://extensions`
2. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
4. Điều hướng và chọn thư mục: `c:\Users\...\Phát triển ứng dụng\browser-extension`.
5. Tiện ích **"AI Lecture Subtitle & Summary"** sẽ xuất hiện trên danh sách tiện ích.
6. Bấm vào biểu tượng mảnh ghép (Extensions) trên thanh công cụ của trình duyệt và bấm **Ghim (Pin)** tiện ích ra ngoài thanh công cụ để tiện sử dụng.

---

### PHẦN 3: CÀI ĐẶT & KHỞI CHẠY MOBILE / WEB APP (`mobile-app`)

1. **Mở một cửa sổ terminal mới và chuyển vào thư mục `mobile-app`:**
   ```powershell
   cd "mobile-app"
   ```

2. **Cài đặt các gói thư viện Node.js:**
   ```powershell
   npm install
   ```

3. **Khởi chạy ứng dụng:**
   * **Chạy trên Trình duyệt Web (khuyến nghị để kiểm tra nhanh):**
     ```powershell
     npm run web
     ```
     Trình duyệt sẽ tự động mở trang web ứng dụng tại: `http://localhost:8081`

   * **Chạy trên Điện thoại di động (Android / iOS):**
     ```powershell
     npm start
     ```
     - Cài ứng dụng **Expo Go** trên điện thoại (từ CH Play hoặc App Store).
     - Đảm bảo điện thoại và máy tính cùng kết nối chung một mạng Wi-Fi (hoặc dùng đường truyền Cloudflare / ngrok).
     - Dùng camera (iOS) hoặc ứng dụng Expo Go (Android) quét mã QR hiển thị trên màn hình terminal.

---

## 📱 HƯỚNG DẪN SỬ DỤNG TIỆN ÍCH VÀ ỨNG DỤNG

### 1. HƯỚNG DẪN SỬ DỤNG TIỆN ÍCH TRÌNH DUYỆT (BROWSER EXTENSION)

* **Bước 1: Mở video bài giảng trên YouTube**
  Truy cập YouTube và mở video bài giảng học thuật bất kỳ (tiếng Anh hoặc tiếng Việt).
* **Bước 2: Kích hoạt công cụ hỗ trợ**
  - Bấm vào biểu tượng tiện ích trên thanh công cụ trình duyệt (hoặc sử dụng thanh công cụ nổi tích hợp trực tiếp trên khung phát video).
* **Bước 3: Xem phụ đề song ngữ trực tiếp**
  - Chọn chế độ phụ đề song ngữ (Anh - Việt). Phụ đề sẽ hiển thị nổi trên khung video theo thời gian thực và đồng bộ chuẩn xác với từng lời giảng viên nói.
* **Bước 4: Xem tóm tắt bài giảng nhanh**
  - Mở thanh bên (Sidebar) của tiện ích để đọc các ý chính tóm lược mà AI vừa trích xuất từ bài giảng.
* **Bước 5: Tải phụ đề và tài liệu bài giảng**
  - Tiện ích cho phép tải về phụ đề dưới dạng file `.srt` hoặc `.vtt` và tóm tắt dưới dạng `.txt` để ôn tập khi ngoại tuyến.

---

### 2. HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG DI ĐỘNG & WEB APP (MOBILE APP)

Ứng dụng được thiết kế tối ưu với 3 thẻ tác vụ chính ở thanh điều hướng đáy:

#### 🎬 Tab 1: Bài giảng (Lecture Player & Learning Center)
* **Bắt đầu bài giảng:** Dán liên kết video YouTube hoặc chọn một bài giảng có sẵn từ mục lịch sử.
* **Theo dõi phụ đề tương tác (Interactive Subtitles):**
  - Phụ đề song ngữ hiển thị cuộn tự động (Auto-scroll) khớp theo giây của video.
  - Bấm vào bất kỳ dòng phụ đề nào để tua video nhảy ngay đến thời điểm giảng viên giảng nội dung đó.
  - Tùy chỉnh cỡ chữ, kiểu hiển thị (Song ngữ / Chỉ tiếng Việt / Chỉ tiếng Anh).
* **Đọc Tóm tắt kiến thức (AI Summary):**
  - Chuyển sang tab **"Tóm tắt"** để nắm bắt tổng thể bài học, dàn ý chính và điểm mấu chốt.
* **Làm bài Trắc nghiệm ôn tập (AI Quiz):**
  - Chuyển sang tab **"Trắc nghiệm"** để làm các câu hỏi trắc nghiệm khách quan 4 đáp án do AI tạo từ bài học.
  - Nhận điểm số ngay sau khi hoàn thành, kèm giải thích cặn kẽ vì sao đúng/sai.

#### 👤 Tab 2: Hồ sơ học viên (Profile & Achievement)
* **Đăng ký / Đăng nhập tài khoản:** Giúp lưu trữ và đồng bộ hóa lịch sử học tập lên cơ sở dữ liệu đám mây (Cloud Firestore).
* **Quên mật khẩu an toàn:** Hỗ trợ quy trình 2 bước: Nhập email nhận mã xác thực **OTP 6 chữ số** và tạo mật khẩu mới.
* **Hệ thống cấp bậc học viên:** Tích lũy điểm kinh nghiệm (EXP) qua từng bài giảng hoàn thành và bài trắc nghiệm làm đúng để thăng cấp danh hiệu:
  - 🥉 *Học viên mới* $\rightarrow$ 🥈 *Tập sự* $\rightarrow$ 🥇 *Chăm chỉ* $\rightarrow$ 🏆 *Chuyên cần* $\rightarrow$ 👑 *Học giả*.
* **Vuốt xuống để làm mới (Pull-to-refresh):** Cập nhật ngay các chỉ số học tập mới nhất.

#### ⚙️ Tab 3: Cài đặt hệ thống (Settings)
* **📁 Thư mục tải về mặc định:** Cài đặt thư mục cố định trên thiết bị để lưu trữ file phụ đề (.srt, .vtt) và tài liệu (.txt) mà không cần xác nhận nhiều lần.
* **🧹 Quản lý dữ liệu & Bộ nhớ:** Xóa bộ nhớ đệm lịch sử bài giảng trên thiết bị khi muốn giải phóng dung lượng.
* **⚙️ Dữ liệu & Sao lưu cấu hình:** Xuất và nạp file cấu hình cá nhân để phục hồi trên thiết bị khác.
* **ℹ️ Thông tin hệ thống:** Tra cứu thông tin phiên bản (v1.2.0), động cơ Whisper ASR, mô-đun NLP AI và thông tin nhóm phát triển ĐH Lạc Hồng.
* **⚖️ Thông tin pháp lý & Quyền riêng tư:** Xem điều khoản dịch vụ học thuật phi thương mại, chính sách bảo mật dữ liệu và mã hóa tài khoản.
* **🔒 Bảo mật tài khoản & Đăng xuất:** Nút cập nhật mật khẩu và đăng xuất được bố trí an toàn ở phía dưới cùng.

---

## 🔒 BẢO MẬT & QUYỀN RIÊNG TƯ

1. **Mã hóa mật khẩu:** Mật khẩu người dùng được băm một chiều an toàn (Bcrypt / Firebase Auth).
2. **Xác thực bảo vệ bằng OTP:** Hệ thống gửi mã xác minh 6 số ngẫu nhiên có thời hạn khi thực hiện khôi phục tài khoản.
3. **Quyền riêng tư dữ liệu:** Dữ liệu học tập và bài giảng của người dùng chỉ phục vụ mục đích nghiên cứu, học tập cá nhân, tuyệt đối không chia sẻ cho bên thứ ba.
4. **Bản quyền phương tiện:** Hệ thống tôn trọng quyền sở hữu trí tuệ của tác giả video gốc trên YouTube; chỉ xử lý âm thanh bài giảng phục vụ mục đích hỗ trợ học thuật phi thương mại.

---

## 📄 GIẤY PHÉP (LICENSE)

Dự án được phân phối dưới giấy phép **MIT License**. Xem chi tiết tại mã nguồn dự án. Phục vụ mục đích học tập và nghiên cứu khoa học tại Trường Đại học Lạc Hồng (LHU).
