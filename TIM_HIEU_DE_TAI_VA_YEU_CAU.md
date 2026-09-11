# ĐỀ TÀI: ỨNG DỤNG TỰ ĐỘNG TÓM TẮT VÀ ĐỒNG BỘ PHỤ ĐỀ ĐA NGÔN NGỮ CHO VIDEO BÀI GIẢNG

---

## I. THÔNG TIN CHUNG
* **Học phần:** Phát triển Ứng dụng
* **Đơn vị:** Trường Đại học Lạc Hồng
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường (Email: `thuongpt@lhu.edu.vn` | SĐT: `0917239111`)
* **Nhóm sinh viên thực hiện:**
  1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)
  2. **Vũ Đình Khánh Long** (MSSV: `123001217`)
* **Mục tiêu cốt lõi:** Xây dựng hệ sinh thái hỗ trợ học tập đa nền tảng (Mobile App + Chrome Extension + Backend AI) giúp loại bỏ rào cản ngôn ngữ, tự động tạo phụ đề có mốc thời gian (timestamps), dịch thuật và tóm tắt bài giảng với chi phí tối ưu (ưu tiên mã nguồn mở / 0 đồng).

---

## II. HỆ SINH THÁI ĐỀ TÀI LÀM NHỮNG GÌ?

Hệ thống được thiết kế theo mô hình client-server, phục vụ người học qua 3 phân hệ chính:

```
                                  [ NGƯỜI DÙNG ]
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
        [ ỨNG DỤNG DI ĐỘNG ]                        [ TIỆN ÍCH TRÌNH DUYỆT ]
           (React Native)                                (Chrome Extension)
  - Dán URL (YouTube, Drive, LMS)              - Bắt âm thanh trực tiếp từ Tab web
  - Ghi âm trực tiếp (Live-caption qua Mic)    - Lớp phủ phụ đề (Overlay) trên video
  - Đọc bản tóm tắt bài giảng                  - Dịch song ngữ trực tiếp trên màn hình
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         ▼ (REST API / WebSocket)
                         [ BACKEND API & AI ENGINE ]
                         (Node.js / FastAPI + Python)
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
   [ Trích xuất Audio ]        [ Lõi Speech-to-Text ]      [ NLP: Dịch & Tóm tắt ]
  - yt-dlp / stream parser    - OpenAI Whisper (Local)    - Dịch thuật đa ngôn ngữ
  - Tách audio không tải video - Trả về mốc thời gian      - LLM tóm tắt ý chính bài
                                (Timestamps chính xác)
                                         │
                                         ▼
                              [ CƠ SỞ DỮ LIỆU MONGODB ]
                     (Lưu tài khoản, lịch sử video, cache phụ đề)
```

### 1. Ứng dụng Di động (Mobile App)
* **Xử lý qua liên kết (URL Processing):** Người dùng chỉ cần nhập liên kết video bài giảng (YouTube, Google Drive, LMS trường...). Hệ thống tự bóc tách âm thanh để tạo phụ đề và tóm tắt mà người dùng không cần tải video nặng về máy.
* **Ghi âm trực tiếp tại giảng đường (Live-Caption):** Bật micro điện thoại trong lúc giáo viên giảng, âm thanh được truyền lên AI để nhận diện và hiển thị phụ đề theo thời gian thực (Real-time).
* **Đồng bộ phụ đề đa ngôn ngữ:** Phụ đề hiển thị chuẩn từng giây (timestamps), cho phép chuyển đổi ngôn ngữ (Việt - Anh - Nhật - Hàn...).
* **Bản tóm tắt bài giảng thông minh (AI Summary):** Trích xuất dàn ý, các khái niệm chính, công thức, bài tập quan trọng giúp ôn tập nhanh trước kỳ thi.

### 2. Tiện ích Mở rộng Trình duyệt (Browser Extension)
* **Bắt luồng âm thanh từ Tab (Tab Audio Capture):** Nhận diện và thu âm thanh trực tiếp từ tab đang phát bài giảng (Coursera, Udemy, YouTube, website trường) mà không bị ảnh hưởng bởi tạp âm bên ngoài.
* **Lớp phủ phụ đề trực quan (Subtitle Overlay):** Hiển thị thanh phụ đề nổi đè lên trên khung hình video.
* **Tùy chỉnh giao diện hiển thị:** Cho phép đổi kích thước chữ, màu nền, vị trí hiển thị phụ đề để không che khuất bài giảng.

### 3. Hệ thống Backend & Lõi AI (Backend AI Service)
* **Bộ xử lý âm thanh (Audio Ingestion):** Dùng `yt-dlp` và `ffmpeg` để trích xuất nhanh stream âm thanh (`.mp3` / `.wav` / `.m4a`) với dung lượng nhỏ nhất.
* **Nhận diện giọng nói (Speech-to-Text - STT):** Mô hình **OpenAI Whisper** (chạy cục bộ/máy chủ) xử lý tạo phụ đề định dạng `.srt` hoặc `.vtt` chuẩn xác từng mili-giây.
* **Xử lý ngôn ngữ tự nhiên (NLP):**
  * Dịch phụ đề sang ngôn ngữ đích.
  * Tóm tắt bài giảng bằng các mô hình LLM (như Gemini Free API, Ollama hoặc DeepSeek).
* **Cơ sở dữ liệu (MongoDB):** Lưu cache các video đã từng xử lý để khi người dùng khác yêu cầu cùng một link sẽ có kết quả ngay lập tức (0 giây chờ).

---

## III. CẦN CHUẨN BỊ NHỮNG GÌ? (YÊU CẦU KỸ THUẬT & CÔNG NGHỆ)

Để bắt đầu làm đề tài, hai bạn cần chuẩn bị các công cụ, môi trường và kiến thức sau:

### 1. Môi trường phần mềm & Công cụ phát triển
* **Hệ điều hành:** Windows 10/11 (khuyến khích máy có GPU NVIDIA để chạy Whisper nhanh, nếu không có GPU thì dùng CPU với thư viện `faster-whisper`).
* **Node.js (LTS v18 hoặc v20+):** Dùng cho React Native, Chrome Extension và Node.js Backend.
* **Python (v3.10 hoặc v3.11):** Dùng để chạy lõi AI Whisper, FastAPI, xử lý audio.
* **FFmpeg:** **Bắt buộc cài đặt** trên máy và thêm vào biến môi trường `PATH` để bóc tách/chuyển đổi định dạng âm thanh.
* **Git:** Quản lý mã nguồn nhóm (GitHub / GitLab).
* **MongoDB:** Cài MongoDB Community Server cục bộ hoặc đăng ký MongoDB Atlas (Free Cloud).
* **Trình duyệt:** Google Chrome / MS Edge (hỗ trợ phát triển Extension Manifest V3).

### 2. Thư viện & Framework cụ thể cho từng thành phần

| Thành phần | Công nghệ chính | Thư viện & Công cụ chi tiết |
| :--- | :--- | :--- |
| **Lõi AI & Audio** | Python | `faster-whisper` (nhanh gấp 4 lần Whisper gốc), `yt-dlp` (bắt link video), `ffmpeg-python`, `pydantic`, `torch` |
| **NLP & Tóm tắt** | Python / API | Google Gemini API (bản miễn phí) hoặc Ollama (Llama 3 / Mistral chạy local) |
| **Backend Service** | Node.js hoặc Python FastAPI | `FastAPI` (khuyên dùng vì kết nối trực tiếp với Python AI), `WebSocket` (cho Live-caption realtime), `Mongoose / Motor` (MongoDB) |
| **Mobile App** | React Native | `Expo` hoặc `React Native CLI`, `react-native-track-player`, `expo-av` (ghi âm mic), `axios`, `react-native-reanimated` |
| **Chrome Extension**| JavaScript / HTML / CSS | Manifest V3, `chrome.tabCapture` API, `chrome.runtime`, Content Script Overlay |
| **Cơ sở dữ liệu** | MongoDB | Lưu collections: `Users`, `Lectures`, `Subtitles`, `Summaries` |

### 3. Kiến thức & Kỹ năng cần trau dồi
1. **Kỹ năng xử lý âm thanh & AI:**
   * Cách dùng `yt-dlp` để lấy stream audio từ link YouTube/Drive.
   * Cách chạy mô hình Whisper để bóc tách mốc thời gian (`start`, `end`, `text`).
   * Viết Prompt hiệu quả để LLM tóm tắt bài giảng theo cấu trúc mục lục rõ ràng.
2. **Kỹ năng Real-time & WebSocket:**
   * Truyền luồng audio từ điện thoại/micro lên server qua WebSocket để tạo Live-caption.
3. **Kỹ năng phát triển Extension:**
   * Nắm rõ cơ chế hoạt động của Background Service Worker, Content Script và cách vẽ UI phụ đề đè lên thẻ `<video>`.

---

## IV. LỘ TRÌNH THỰC HIỆN CHI TIẾT (15 TUẦN)

* **Tuần 1 - 2 (24/08/2026 - 06/09/2026):**
  * Khảo sát mô hình AI Whisper, thư viện `yt-dlp`.
  * Thiết kế Database MongoDB và phác thảo giao diện UI/UX (Figma).
* **Tuần 3 - 5 (07/09/2026 - 27/09/2026):**
  * Xây dựng Backend AI Core: API nhận URL -> Tải audio -> Whisper chuyển giọng nói thành chữ -> LLM tóm tắt.
* **Tuần 6 - 8 (28/09/2026 - 18/10/2026):**
  * Xây dựng Mobile App (React Native): Màn hình dán link, màn hình xem phụ đề đồng bộ, tính năng ghi âm trực tiếp qua mic.
* **Tuần 9 - 11 (19/10/2026 - 08/11/2026):**
  * Xây dựng Extension: Bắt audio tab bằng `chrome.tabCapture`, hiển thị lớp phủ overlay phụ đề.
* **Tuần 12 - 13 (09/11/2026 - 22/11/2026):**
  * Tích hợp toàn hệ thống: Ghép nối Mobile + Extension với Backend, tối ưu độ trễ và xử lý lỗi.
* **Tuần 14 - 15 (23/11/2026 - 06/12/2026):**
  * Viết báo cáo hoàn chỉnh, quay video demo sản phẩm, chuẩn bị slide bảo vệ trước hội đồng.

---

## V. CẤU TRÚC THƯ MỤC DỰ ÁN ĐỀ XUẤT

```text
Phát triển ứng dụng/
├── TIM_HIEU_DE_TAI_VA_YEU_CAU.md   <-- File tài liệu này
├── docs/                           <-- Tài liệu báo cáo, sơ đồ kiến trúc, slide
├── backend-ai/                     <-- Server FastAPI / Node.js + Lõi AI Whisper & Summarizer
│   ├── app/
│   │   ├── api/                    <-- Các route API (video, live, summary)
│   │   ├── services/               <-- whisper_service, audio_service, summary_service
│   │   └── models/                 <-- MongoDB schemas
│   └── requirements.txt
├── mobile-app/                     <-- Ứng dụng di động React Native (Expo)
│   ├── src/
│   │   ├── screens/                <-- Màn hình Home, Player, LiveCaption, Summary
│   │   └── components/             <-- Component phụ đề, thanh điều khiển
│   └── package.json
└── browser-extension/              <-- Tiện ích mở rộng Chrome Extension Manifest V3
    ├── manifest.json
    ├── background.js               <-- Bắt audio tab
    ├── content.js                  <-- Lớp phủ overlay phụ đề
    └── popup.html / popup.js       <-- Menu cài đặt tiện ích
```
