# 🎓 HỆ THỐNG TỰ ĐỘNG TÓM TẮT & ĐỒNG BỘ PHỤ ĐỀ ĐA NGÔN NGỮ CHO VIDEO BÀI GIẢNG
### (AI Lecture Subtitle, Translation & Smart Summary Ecosystem)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20v2.0-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/Frontend-React%20Native%20%2F%20Expo-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![OpenAI Whisper](https://img.shields.io/badge/ASR-Faster--Whisper%20CUDA-74aa9c?logo=openai&logoColor=white)](https://github.com/SYSTRAN/faster-whisper)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama%20Qwen%202.5-white?logo=ollama&logoColor=black)](https://ollama.com/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Học phần:** Phát triển Ứng dụng  
> **Trường:** Đại học Lạc Hồng (LHU) - Khoa Công nghệ Thông tin  
> **Giảng viên hướng dẫn:** ThS. Phan Mạnh Thường  
> **Nhóm sinh viên thực hiện:**
> 1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)  
> 2. **Vũ Đình Khánh Long** (MSSV: `123001217` - Thành viên)  

---

## 📑 MỤC LỤC
1. [Giới thiệu Dự án](#-giới-thiệu-dự-án)
2. [Tính năng Nổi bật](#-tính-năng-nổi-bật)
3. [Kiến trúc Hệ thống Toàn diện](#-kiến-trúc-hệ-thống-toàn-diện)
4. [Cấu trúc Thư mục Dự án](#-cấu-trúc-thư-mục-dự-án)
5. [Yêu cầu Môi trường](#-yêu-cầu-môi-trường)
6. [Hướng dẫn Khởi chạy Chi tiết](#-hướng-dẫn-khởi-chạy-chi-tiết)
   - [Cách 1: Khởi chạy Máy chủ AI trên Google Colab GPU T4 (Khuyến nghị)](#cách-1-chạy-máy-chủ-ai-trên-google-colab-gpu-tesla-t4-khuyến-nghị-100)
   - [Cách 2: Khởi chạy Máy chủ Localhost](#cách-2-chạy-máy-chủ-backend-cục-bộ-localhost)
   - [Cài đặt Tiện ích Trình duyệt (Browser Extension)](#cài-đặt-tiện-ích-mở-rộng-trình-duyệt-browser-extension)
   - [Khởi chạy Mobile App & Web App (React Native - Expo)](#khởi-chạy-mobile-app--web-app-react-native---expo)
7. [Hướng dẫn Sử dụng Chi tiết](#-hướng-dẫn-sử-dụng-chi-tiết)
8. [Tài liệu API Endpoints](#-tài-liệu-api-endpoints)
9. [Bảo mật & Bản quyền](#-bảo-mật--quyền-riêng-tư)
10. [Giấy phép (License)](#-giấy-phép-license)

---

## 📖 GIỚI THIỆU DỰ ÁN

Trong kỷ nguyên số hóa giáo dục, các nền tảng video học tập trực tuyến (đặc biệt là YouTube, Coursera, MIT OpenCourseWare) sở hữu nguồn tri thức khổng lồ. Tuy nhiên, người học thường xuyên đối mặt với 3 thách thức lớn:
* **Rào cản ngôn ngữ:** Phần lớn bài giảng quốc tế chuyên sâu sử dụng tiếng Anh hoặc thiếu phụ đề chuẩn xác.
* **Tốn thời gian:** Bài giảng kéo dài 45–90 phút, khó nắm bắt dàn ý và các công thức/thuật ngữ quan trọng.
* **Thiếu tương tác ôn tập:** Không có hệ thống câu hỏi kiểm tra củng cố kiến thức ngay sau khi xem video.

**Hệ thống AI Lecture Subtitle, Translation & Smart Summary** được nghiên cứu và phát triển để giải quyết triệt để các vấn đề trên thông qua hệ sinh thái 3 nền tảng tích hợp:
1. **Máy chủ AI (Backend AI):** Xử lý nhận dạng giọng nói tốc độ cao trên GPU với mô hình Whisper, dịch thuật đồng bộ timestamps và tóm tắt thông minh qua Gemini 2.5 Flash / Ollama Local.
2. **Tiện ích Chrome (Browser Extension Manifest V3):** Hiển thị khung phụ đề song ngữ Glassmorphism trực tiếp trên trình phát video YouTube, tích hợp phát âm chuẩn giọng bản ngữ Google Translate (Chị Google).
3. **Ứng dụng Di động & Web (React Native - Expo):** Cung cấp không gian học tập di động, tra cứu sơ đồ tư duy (Mindmap), làm bài tập trắc nghiệm và đồng bộ đám mây đa thiết bị.

---

## ✨ TÍNH NĂNG NỔI BẬT

### 🎙️ 1. Bóc tách giọng nói (ASR) & Đồng bộ Phụ đề Song ngữ
* **Nhận diện chính xác từng giây:** Ứng dụng mô hình `faster-whisper` (hỗ trợ CUDA float16), tự động lọc khoảng lặng (`vad_filter`) và bóc tách câu chữ chuẩn xác.
* **Chống lặp câu & ảo giác:** Tích hợp `condition_on_previous_text=False` và `initial_prompt` theo ngữ cảnh bài giảng tiếng Việt.
* **Hiển thị song ngữ (Bilingual):** Dòng dịch chính hiển thị to rõ phía trên, dòng gốc tiếng Anh/Việt hiển thị mờ phía dưới.

### 🔊 2. Phát âm chuẩn giọng bản ngữ Google Translate (Voice TTS)
* **Chuẩn giọng Google 100%:** Phát âm tiếng Việt chuẩn có dấu, ngữ điệu tự nhiên (giọng chị Google quen thuộc) hoặc tiếng Anh, Nhật, Hàn, Trung bản ngữ.
* **Tương tác trực quan:** Nhấp đúp chuột vào từ hoặc kéo bôi đen cụm từ trên khung phụ đề để nghe phát âm ngay tức thì.
* **Cơ chế dự phòng kép:** Gọi qua Backend AI proxy hoặc phát trực tiếp từ luồng âm thanh Google Translate, loại bỏ hoàn toàn lỗi mạng.

### 📝 3. Tóm tắt 4 phần & Sinh câu hỏi ôn tập (AI Quiz)
* **Bản tóm tắt chuyên sâu:** Đầy đủ 4 cấu phần:
  1. *Tóm tắt tổng quan bài giảng* (Executive Summary).
  2. *Các luận điểm then chốt* (Key Points).
  3. *Thuật ngữ chuyên ngành & công thức* (Formulas & Terms).
  4. *Sơ đồ phân cấp tư duy* (Mindmap).
* **Ngân hàng trắc nghiệm tự động:** Tạo các câu hỏi 4 lựa chọn (A, B, C, D) kèm mốc thời gian xuất hiện trong video và giải thích đáp án chi tiết.

### ⚡ 4. Bộ nhớ đệm Đám mây Đa tầng (0.01s Instant Cache)
* Lưu trữ vĩnh viễn dữ liệu bài giảng vào Google Cloud Firestore.
* Khi người dùng xem lại bài giảng cũ, hệ thống trả kết quả ngay trong **0,01 giây**, **tiết kiệm 100% token Gemini và tài nguyên GPU**.

### 📱 5. Tự động đồng bộ hóa toàn diện (Zero-Config Sync)
* Máy chủ Colab sau khi bật sẽ tự động đẩy URL đường hầm Cloudflare lên Firestore.
* Cả **Ứng dụng Di động** và **Tiện ích Chrome** đều tự động phát hiện đường dẫn máy chủ mới nhất mà người dùng **không cần nhập tay URL**.

---

## 🏛️ KIẾN TRÚC HỆ THỐNG TOÀN DIỆN

```mermaid
flowchart TD
    subgraph Client["Lớp Giao diện & Tương tác"]
        Ext["Chrome Extension (Manifest V3)\n- Giao diện phụ đề nổi YouTube\n- Google Voice TTS\n- Lưu tạm SessionStorage"]
        App["Mobile / Web App (React Native)\n- Expo SDK 57\n- Interactive Player\n- Quiz & Mindmap Viewer"]
    end

    subgraph Gateway["Cổng Kết nối & Định tuyến"]
        CF["Cloudflare Quick Tunnel\n(HTTPS://*.trycloudflare.com)"]
        FS_Cfg[("Firebase Firestore\nsystem_config/server")]
    end

    subgraph Backend["Hệ thống Máy chủ Backend AI (FastAPI)"]
        API["FastAPI 2.0 Router\n/api/video/process\n/api/video/info\n/api/tts\n/api/auth"]
        Cache[("Firebase Firestore\nBộ nhớ đệm bài giảng")]
        Whisper["Faster-Whisper CUDA\n(Tesla T4 Float16 ASR)"]
        LLM["AI Summarizer & Quiz Engine\n- Ollama Local (Qwen 2.5 3B)\n- Gemini 2.5 Flash"]
    end

    Ext -->|"1. Lấy URL máy chủ"| FS_Cfg
    App -->|"1. Lấy URL máy chủ"| FS_Cfg
    Ext -->|"2. Gửi URL Video"| CF
    App -->|"2. Gửi URL Video"| CF
    CF --> API
    API -->|"Tra cứu Cache"| Cache
    API -->|"Tách Audio & Phiên âm"| Whisper
    API -->|"Tóm tắt & Tạo trắc nghiệm"| LLM
    API -->|"Lưu trữ bài giảng"| Cache
```

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```text
Phát triển ứng dụng/
├── src/backend-ai/                  # MÃ NGUỒN MÁY CHỦ BACKEND AI (FASTAPI)
│   ├── app/
│   │   ├── api/
│   │   │   └── websocket_router.py  # WebSocket bóc tách trực tiếp (Live Caption)
│   │   ├── core/
│   │   │   ├── config.py            # Cấu hình biến môi trường
│   │   │   ├── dependencies.py      # Xác thực JWT, rate limit & phân quyền
│   │   │   ├── logging_config.py    # Log tập trung kèm request-id
│   │   │   └── metrics.py           # Bộ đếm metrics dạng Prometheus text
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic schemas (Request/Response models)
│   │   ├── routers/
│   │   │   ├── auth.py              # Đăng ký, đăng nhập, OTP, xuất/vô hiệu hoá tài khoản
│   │   │   ├── export.py            # Xuất tài liệu PDF / DOCX / Markdown
│   │   │   ├── history.py           # Lịch sử bài giảng có phân trang
│   │   │   └── video.py             # Xử lý video, media token, stream proxy, burn phụ đề
│   │   ├── services/
│   │   │   ├── audio_service.py     # yt-dlp, FFmpeg & kiểm tra SSRF
│   │   │   ├── auth_service.py      # Băm mật khẩu, JWT & media token
│   │   │   ├── cleanup_service.py   # Dọn file upload/audio tạm và job cũ
│   │   │   ├── email_service.py     # Gửi mã OTP xác minh qua Email
│   │   │   ├── subtitle_exporter.py # Xuất định dạng SRT, VTT, TXT
│   │   │   ├── subtitle_parser.py   # Phân tích file phụ đề tải lên
│   │   │   ├── summary_service.py   # Pipeline tóm tắt & Quiz qua Gemini / Ollama
│   │   │   ├── translation_service.py# Dịch thuật song ngữ đa ngôn ngữ
│   │   │   └── whisper_service.py   # Nhận diện giọng nói Faster-Whisper
│   │   ├── export_service.py        # Render PDF (WeasyPrint/ReportLab), DOCX, Markdown
│   │   ├── firebase_database.py     # Firestore: cache, lịch sử, export & soft delete
│   │   └── main.py                  # FastAPI, middleware, health/readiness, cleanup loop
│   ├── tests/                       # 154 unit/integration tests (pytest)
│   ├── requirements.txt             # Thư viện Python chạy production
│   ├── requirements-dev.txt         # Thêm pytest/httpx cho CI
│   ├── Dockerfile                   # Image production (ffmpeg + Pango/Cairo)
│   ├── run_server.py                # Khởi chạy máy chủ cục bộ
│   └── .env.example                 # Mẫu biến môi trường backend
│
├── src/browser-extension/           # TIỆN ÍCH MỞ RỘNG TRÌNH DUYỆT (MANIFEST V3)
│   ├── manifest.json                # Quyền, host permissions & content scripts
│   ├── popup.html / popup.css       # Giao diện điều khiển nhanh khi click icon
│   ├── popup.js                     # Điều hướng, gọi API, auto-load bài giảng cũ
│   ├── content.js                   # Tiêm khung phụ đề nổi, TTS & auto-sync YouTube
│   ├── cacheDB.js                   # Cache bài giảng phía client bằng IndexedDB
│   ├── overlay.css                  # Hiệu ứng Glassmorphism cho khung phụ đề
│   └── icons/                       # Icon 16/32/48/128 cho extension
│
├── src/mobile-app/                  # ỨNG DỤNG DI ĐỘNG & WEB (REACT NATIVE / EXPO SDK 57)
│   ├── src/
│   │   ├── screens/                 # Home, Profile, Settings, SyncPlayer, SummaryQuiz...
│   │   ├── components/              # Component giao diện, player, settings, quiz
│   │   ├── constants/theme.js       # Design tokens & hệ màu
│   │   └── services/api.js          # Client API, cache AsyncStorage, media token
│   ├── app.json                     # Cấu hình Expo & định danh phát hành
│   ├── eas.json                     # Profile build development/preview/production
│   ├── package.json                 # Thư viện Expo SDK 57 / React Native 0.86
│   └── App.js                       # Điểm khởi đầu ứng dụng & Bottom Tabs
│
├── scripts/check-extension.mjs      # Kiểm tra manifest MV3 và cú pháp extension
├── scripts/backup_firestore.py      # Sao lưu Firestore ra JSON Lines
├── .github/workflows/               # CI, security audit & deploy Firestore rules
├── firestore.rules                  # Chặn truy cập Firestore trực tiếp từ client
├── firebase.json / .firebaserc      # Cấu hình deploy Firebase
├── docker-compose.yml               # Chạy backend production bằng Docker
├── PTUD.ipynb                       # Notebook chạy backend trên Google Colab GPU
├── backend_ai_colab.ipynb           # Notebook dự phòng tối ưu Tesla T4
└── docs/                            # Tài liệu học thuật & hướng dẫn dự án
    ├── THIET_KE_KIEN_TRUC_VA_DATABASE.md
    └── QUY_TRINH_KHOI_DONG_LAI_COLAB.md
```

> `serviceAccountKey.json` và file `.env` phải tự tạo từ mẫu, không commit lên Git.

---

## 🛠️ YÊU CẦU MÔI TRƯỜNG

Trước khi cài đặt, hãy đảm bảo máy tính đã cài đặt các công cụ sau:
* **Node.js:** Phiên bản `22.13.x` trở lên (Expo SDK 57 yêu cầu) ([nodejs.org](https://nodejs.org/))
* **Python:** Phiên bản `3.10` hoặc `3.11` ([python.org](https://www.python.org/))
* **Docker (tùy chọn):** Docker Desktop + Docker Compose để chạy backend bằng container.
* **FFmpeg:** Cần thiết cho xử lý âm thanh video ([ffmpeg.org](https://ffmpeg.org/download.html) hoặc cài qua lệnh `winget install Gyan.FFmpeg` trên Windows)
* **Trình duyệt Web:** Google Chrome, Microsoft Edge, Brave hoặc Cốc Cốc.
* **Tài khoản Google Colab:** Dùng để chạy máy chủ Backend AI miễn phí trên card GPU Tesla T4.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY CHI TIẾT

### Chạy nhanh từ thư mục gốc dự án

Các script tiện dụng đã được khai báo trong `package.json` ở thư mục gốc:

```powershell
npm run backend     # Khởi chạy Backend AI (FastAPI)
npm run mobile      # Khởi chạy Expo (điện thoại/Web)
npm run mobile:web  # Chạy trực tiếp trên trình duyệt
```

### CÁCH 1: CHẠY MÁY CHỦ AI TRÊN GOOGLE COLAB GPU TESLA T4 (KHUYẾN NGHỊ 100%)
*Tận dụng card đồ họa Tesla T4 16GB VRAM của Google để bóc tách video siêu tốc, không tốn tài nguyên máy tính cá nhân.*

1. Truy cập [Google Colab](https://colab.research.google.com/) và tải file notebook **`PTUD.ipynb`** lên.
2. Kiểm tra loại phần cứng GPU:  
   * Vào menu **Thời gian chạy (Runtime)** $\rightarrow$ **Thay đổi loại thời gian chạy (Change runtime type)**.  
   * Chọn **T4 GPU** $\rightarrow$ Bấm **Lưu**.
3. Nạp file cấu hình Firebase:  
   * Bấm biểu tượng thư mục 📁 ở cột bên trái Colab.  
   * Kéo thả file **`serviceAccountKey.json`** vào thư mục `/content`.
4. Bấm menu **Thời gian chạy (Runtime)** $\rightarrow$ **Chạy tất cả (Run all)** (hoặc phím tắt `Ctrl + F9`).
5. Đợi Ô số 3 hoàn tất, hệ thống sẽ in ra đường link công khai dạng:
   ```text
   🎉 ĐƯỜNG LINK BACKEND CỦA BẠN LÀ:
   👉 https://xxxx-xxxx-xxxx.trycloudflare.com
   ```
   *(Đường dẫn này được tự động cập nhật lên Firebase Firestore, Tiện ích Chrome và Mobile App sẽ tự động kết nối mà không cần cấu hình thêm).*

---

### CÁCH 2: CHẠY MÁY CHỦ BACKEND CỤC BỘ (LOCALHOST)

1. **Mở terminal chuyển vào thư mục backend:**
   ```powershell
   cd "src/backend-ai"
   ```
2. **Khởi tạo và kích hoạt môi trường ảo Python:**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. **Cài đặt các gói thư viện cần thiết:**
   ```powershell
   pip install -r requirements.txt
   ```
4. **Tạo file cấu hình `.env`:**
   ```env
   PORT=8000
   WHISPER_DEVICE=cpu
   WHISPER_COMPUTE_TYPE=int8
   WHISPER_MODEL_SIZE=base
   GEMINI_API_KEY=your_gemini_api_key_here
   # JWT_SECRET phải dài >= 32 ký tự, nếu thiếu server sẽ từ chối cấp token
   JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
   ACCESS_TOKEN_TTL_MINUTES=60
   REFRESH_TOKEN_TTL_DAYS=30
   REFRESH_REPLAY_GRACE_SECONDS=300
   FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
   ```
5. **Khởi chạy máy chủ:**
   ```powershell
   python run_server.py
   ```
   * Swagger Docs kiểm tra API: **`http://127.0.0.1:8000/docs`**
   * Health check: **`http://127.0.0.1:8000/health`** — Metrics: **`http://127.0.0.1:8000/metrics`**

---

### CÁCH 3: CHẠY BACKEND BẰNG DOCKER (KHUYẾN NGHỊ KHI TRIỂN KHAI)

1. **Đặt khóa Firebase vào thư mục `secrets/`:**
   ```powershell
   copy "src/backend-ai/serviceAccountKey.json" "secrets/serviceAccountKey.json"
   ```
2. **Tạo file `.env` ở thư mục gốc dự án từ mẫu:**
   ```powershell
   copy .env.example .env
   ```
   Mở `.env` và điền `JWT_SECRET` (>= 32 ký tự), `GEMINI_API_KEY`,
   `FIREBASE_PROJECT_ID`. Với `ENVIRONMENT=production`, backend sẽ **fail-fast**
   nếu thiếu SMTP, `PUBLIC_API_URL`/`CORS_ORIGINS` không dùng HTTPS,
   `CORS_ORIGINS`/`ALLOWED_HOSTS` chứa `*` hoặc `METRICS_TOKEN` quá ngắn.
   `TRUSTED_PROXIES` cũng bị từ chối nếu tin cậy toàn bộ Internet
   (`0.0.0.0/0`, `::/0`). Đặt `ALLOWED_HOSTS` bằng domain thật
   (ví dụ `api.example.com`) để chặn Host header lạ. Đặt `METRICS_TOKEN`
   (>= 16 ký tự) để bảo vệ `/metrics`; đặt `ADMIN_TOKEN` (>= 32 ký tự) nếu cần
   API khôi phục tài khoản.
   Nếu chạy sau reverse proxy/load balancer, đặt `TRUSTED_PROXIES` (IP/CIDR,
   phân tách bằng dấu phẩy) để rate limit đọc đúng IP qua `X-Forwarded-For`.
   `/docs` mặc định tắt ở production (bật bằng `ENABLE_DOCS=true`).
   Kênh Live-Caption giới hạn bằng `WS_MAX_CONNECTIONS` (mặc định 20 kết nối)
   và `WS_MAX_BUFFER_BYTES` (mặc định 5 MB) để tránh một client chiếm hết RAM.
3. **Build và chạy:**
   ```powershell
   docker compose up --build
   ```
   Backend sẽ chạy tại `http://localhost:8000`. Container đã cài sẵn `ffmpeg`,
   thư viện render PDF và có healthcheck tự động.

> Ghi chú: mặc định container chạy Whisper trên CPU (`int8`). Nếu máy có GPU
> NVIDIA, có thể đổi `WHISPER_DEVICE=cuda` và cấu hình NVIDIA Container Toolkit.

---

### CHẠY KIỂM THỬ BACKEND

```powershell
cd "src/backend-ai"
pip install -r requirements-dev.txt
pytest
```

Bộ test bao phủ: băm/giải mã JWT, parser SRT/WebVTT, chuẩn hóa quiz/mindmap,
xuất tài liệu PDF/DOCX/Markdown, dọn dẹp TTL, health/readiness, SSRF, phân
quyền cache theo `owner_id`, xuất dữ liệu, vô hiệu hoá tài khoản (xoá mềm),
media token, phân trang lịch sử, giới hạn upload, xác thực/giới hạn WebSocket
và nhận diện IP sau proxy (154 test).

GitHub Actions chạy thêm kiểm tra manifest extension, `expo-doctor`,
`expo export --platform web`, build Docker image, smoke test runtime trong
image Linux (ffmpeg + render PDF bằng WeasyPrint + import app) và quét lỗ hổng
CRITICAL có bản vá bằng Trivy. Workflow `security.yml` chạy `pip-audit` và
`npm audit` (hạ ngưỡng mobile xuống `critical` do phụ thuộc `zod` của
`@expo/cli`).

---

### CÀI ĐẶT TIỆN ÍCH MỞ RỘNG TRÌNH DUYỆT (BROWSER EXTENSION)

1. Mở trình duyệt Chrome / Edge, truy cập: `chrome://extensions/`
2. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
3. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
4. Chọn đường dẫn đến thư mục:  
   `c:\...\Phát triển ứng dụng\src\browser-extension`
5. Tiện ích **"PHỤ ĐỀ BÀI GIẢNG TỰ ĐỘNG"** sẽ xuất hiện trên thanh công cụ trình duyệt. Bấm biểu tượng 📌 để ghim tiện ích.

> Extension chỉ được cấp quyền gọi `localhost` và `https://*.trycloudflare.com`.
> Nếu triển khai backend ở domain riêng (ví dụ `https://api.example.com`), thêm
> domain đó vào `host_permissions` trong `src/browser-extension/manifest.json`
> rồi bấm **Reload** tại `chrome://extensions/`.

---

### KHỞI CHẠY MOBILE APP & WEB APP (REACT NATIVE - EXPO)

1. **Mở terminal chuyển vào thư mục `src/mobile-app`:**
   ```powershell
   cd "src/mobile-app"
   ```
2. **Cài đặt thư viện dependencies:**
   ```powershell
   npm install
   ```
3. **Khởi chạy ứng dụng:**
   * **Chạy trên Trình duyệt Web (Nhanh & Tiện lợi):**
     ```powershell
     npm run web
     ```
     Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:8081`
   * **Chạy trên Điện thoại Android / iOS:**
     ```powershell
     npm start
     ```
     Mở ứng dụng **Expo Go** trên điện thoại, quét mã QR hiển thị trên màn hình terminal để chạy ứng dụng trực tiếp trên thiết bị di động.

---

### ĐÓNG GÓI ỨNG DỤNG DI ĐỘNG (EAS BUILD)

`app.json` đã khai báo định danh phát hành `com.edtechai.lecture` cho cả
Android (`android.package`, `versionCode`) và iOS (`ios.bundleIdentifier`,
`buildNumber`). Cấu hình build nằm trong `eas.json`:

```powershell
npm install -g eas-cli
eas login
eas build --profile preview --platform android   # APK cài trực tiếp
eas build --profile production --platform all     # AAB/IPA cho store
```

* `development`: development client dùng khi cần debug native.
* `preview`: APK nội bộ để cài thử trên máy thật.
* `production`: AAB/IPA và tự tăng `versionCode`/`buildNumber`.

> `cli.appVersionSource` đặt là `local`, nên phiên bản trong `app.json` là
> nguồn duy nhất; profile production tự tăng số build mỗi lần chạy.

---

### TRIỂN KHAI FIRESTORE SECURITY RULES

`firestore.rules` chặn toàn bộ truy cập trực tiếp từ trình duyệt/mobile; chỉ
tài liệu `system_config/server` được đọc công khai. Backend dùng Firebase Admin
SDK nên bỏ qua rules và vẫn hoạt động bình thường.

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project ptud-dt012
```

Workflow `.github/workflows/deploy-firestore-rules.yml` tự deploy khi
`firestore.rules` thay đổi trên nhánh `main`, với điều kiện repo đã cấu hình
secret `FIREBASE_SERVICE_ACCOUNT` (JSON service account có quyền Firebase
Rules Admin).

---

### KHÔI PHỤC TÀI KHOẢN ĐÃ VÔ HIỆU HOÁ

Chức năng "Vô hiệu hoá tài khoản" là **xoá mềm**: backend chỉ ghi
`deleted: true`, `deleted_at` và `account_status: "deleted"` vào document
`users/{userId}`. Bài giảng, `media_owners` và file upload vẫn được giữ nguyên.

Để khôi phục, đặt biến môi trường `ADMIN_TOKEN` (>= 32 ký tự) rồi gọi API
quản trị. Endpoint trả 404 nếu chưa cấu hình token, nên không lộ sự tồn tại:

```bash
# Liệt kê tài khoản đang bị vô hiệu hoá
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://api.example.com/api/admin/users

# Khôi phục một tài khoản
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
  https://api.example.com/api/admin/users/<user_id>/restore
```

Người dùng có thể đăng nhập lại bằng mật khẩu cũ; dữ liệu bài giảng, media và
file upload vẫn còn nguyên. Nếu chưa bật API quản trị, có thể khôi phục thủ
công bằng cách xoá ba trường `deleted`, `deleted_at`, `account_status` trong
Firestore Console (hoặc đặt `deleted: false`).

---

### SAO LƯU DỮ LIỆU FIRESTORE

Script `scripts/backup_firestore.py` xuất toàn bộ collection quan trọng
(`users`, `lectures`, `media_owners`, `system_config`) ra JSON Lines, mỗi
document một dòng. Bản sao lưu được đặt trong `backups/<timestamp>/` và đã
được `.gitignore` bảo vệ vì chứa dữ liệu thật.

```powershell
python scripts/backup_firestore.py
python scripts/backup_firestore.py --out D:\backups --collections users,lectures
```

Script dùng `FIREBASE_CREDENTIALS_PATH` trong `src/backend-ai/.env` (hoặc tham
số `--credentials`). Nên chạy định kỳ bằng Task Scheduler/cron và giữ bản sao
ở nơi khác ngoài máy chủ. Bản backup chứa hash mật khẩu/OTP và phiên đăng nhập,
nên thư mục `backups/` đã được `.gitignore` và script đặt quyền `700/600` trên
POSIX; nếu lưu lên cloud, hãy bật mã hoá phía dịch vụ lưu trữ. Khi cần khôi phục, tạo lại document từ file JSONL
bằng Firestore Console hoặc một script `set()` nhỏ; nếu dùng tính năng export
chính thức của Google Cloud thì nên export thẳng sang Cloud Storage để có thể
`gcloud firestore import`.

---

### LƯU Ý KHI MỞ RỘNG QUY MÔ

Job xử lý video/streaming, bộ đếm hủy job và rate limit hiện lưu trong RAM của
tiến trình. Docker chạy `uvicorn --workers 1`; không tăng số worker hoặc chạy
nhiều instance phía sau load balancer nếu chưa bổ sung hàng đợi ngoài
(Redis/Celery) hoặc định tuyến cố định theo `job_id`. Với quy mô đồ án, một
worker là đủ và tránh phát sinh hạ tầng không cần thiết. Khi đặt sau proxy,
cấu hình `TRUSTED_PROXIES` để rate limit không gộp mọi người dùng vào IP của
proxy; nếu không cấu hình, backend bỏ qua `X-Forwarded-For` để tránh giả mạo.

---

## 📱 HƯỚNG DẪN SỬ DỤNG CHI TIẾT

### 1. Trải nghiệm trên YouTube với Browser Extension
1. Mở video bài giảng bất kỳ trên YouTube (ví dụ: `https://www.youtube.com/watch?v=Grr2fedvm00`).
2. Bấm vào biểu tượng tiện ích trên thanh công cụ:
   * Nếu bài giảng đã được xử lý trước đó, tiện ích sẽ **tự động nạp phụ đề chỉ trong 1-2 giây**.
   * Nếu là video mới, bấm **⚡ Bắt đầu tạo phụ đề** để máy chủ AI tiến hành bóc tách.
3. **Xem phụ đề song ngữ trực tiếp:** Khung phụ đề nổi Glassmorphism sẽ hiển thị ngay phía trên thanh điều khiển của video YouTube.
4. **Phát âm từ vựng chuẩn giọng Google:** Bôi đen bất kỳ từ hoặc câu nào trên khung phụ đề để nghe giọng chị Google đọc chuẩn xác.
5. **Xem Tóm tắt & Trắc nghiệm:** Chuyển qua các tab **Tóm tắt** và **Trắc nghiệm** ngay trong popup để ôn tập kiến thức cốt lõi.

### 2. Trải nghiệm trên Ứng dụng Di động & Web (Mobile App)
* **Tab Bài giảng:** Dán link YouTube để xem video, theo dõi phụ đề cuộn đồng bộ theo thời gian thực (nhấp vào dòng phụ đề bất kỳ để tua video tới mốc thời gian tương ứng).
* **Tab Tóm tắt & Mindmap:** Đọc các ý chính tóm lược và sơ đồ cây phân cấp tri thức bài học.
* **Tab Trắc nghiệm:** Làm bài tập trắc nghiệm củng cố kiến thức, nhận điểm số và giải thích đáp án ngay lập tức.
* **Tab Hồ sơ:** Theo dõi cấp bậc học viên, tích lũy điểm kinh nghiệm (EXP) và quản lý tài khoản cá nhân.
* **Xuất tài liệu:** Nút **Tài liệu** cho phép lưu bản tóm tắt dạng văn bản (`.txt`) hoặc gọi máy chủ dựng **PDF / Word (.docx) / Markdown** có bìa, mục lục và bảng phụ đề song ngữ.
* **Bộ nhớ đệm ngoại tuyến:** Tóm tắt, mindmap và quiz được lưu bằng `AsyncStorage`; mục **Cài đặt → Quản lý dữ liệu** xoá đồng thời lịch sử và cache. Extension dùng `IndexedDB` và có nút **Xoá bộ nhớ đệm bài giảng** trong popup.
* **Quyền riêng tư dữ liệu:** Tại **Cài đặt → Dữ liệu & sao lưu** có thể tải toàn bộ dữ liệu cá nhân dạng JSON; mục **Bảo mật tài khoản** cho phép **vô hiệu hoá tài khoản** (xoá mềm). Hệ thống đăng xuất và chặn đăng nhập, nhưng bài giảng, media và file vẫn được giữ trong Firestore để quản trị viên khôi phục khi cần. Tài khoản email/mật khẩu phải xác nhận mật khẩu, còn tài khoản Google dùng phiên đăng nhập hiện tại.

---

## 🔌 TÀI LIỆU API ENDPOINTS

| Phương thức | Endpoint | Mô tả chức năng | Quyền truy cập |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Kiểm tra tình trạng hoạt động của Máy chủ AI | Public |
| `POST` | `/api/auth/register` | Đăng ký tài khoản học viên mới | Public |
| `POST` | `/api/auth/login` | Đăng nhập hệ thống, cấp access token + refresh token | Public |
| `POST` | `/api/auth/refresh` | Đổi refresh token lấy access token mới (có xoay token) | Public |
| `POST` | `/api/auth/logout` | Thu hồi phiên hiện tại hoặc toàn bộ phiên (`revoke_all`) | Optional Token |
| `POST` | `/api/auth/forgot-password` | Gửi mã OTP khôi phục mật khẩu qua Email | Public |
| `POST` | `/api/auth/reset-password` | Xác thực mã OTP và đặt lại mật khẩu mới | Public |
| `GET` | `/api/video/info` | Tra cứu nhanh thời lượng & kiểm tra bài giảng trong Cache | Bearer Token |
| `POST` | `/api/video/process` | Bóc tách âm thanh, Whisper ASR, dịch thuật và tóm tắt | Bearer Token |
| `POST` | `/api/video/lookahead` | Tải phụ đề trước 15s cho video dài (Streaming, có rate limit) | Public / Token |
| `POST` | `/api/video/cancel/{job_id}`| Hủy tiến trình xử lý đang chạy ngầm | Bearer Token |
| `GET` | `/api/tts` | Phát âm chuẩn Google Translate TTS đa ngôn ngữ | Public / Optional |
| `GET` | `/api/history` | Lấy danh sách bài giảng đã học theo tài khoản (`?limit=25&offset=0`) | Bearer Token |
| `POST` | `/api/subtitles/process` | Dịch & tạo trắc nghiệm từ file phụ đề tải lên (.srt, .vtt) | Bearer Token |
| `POST` | `/api/video/burn-subtitles`| Nhúng (burn) phụ đề cứng trực tiếp vào video qua FFmpeg | Bearer Token |
| `GET` | `/api/video/stream-status` | Theo dõi tiến độ job streaming nền | Bearer Token |
| `POST` | `/api/media/token` | Cấp token ngắn hạn cho file `/uploads/...` hoặc URL stream hợp lệ | Bearer Token |
| `GET` | `/api/video/stream-media` | Proxy phát video (Range Request) cho Drive/LMS | Bearer Token hoặc media token |
| `POST` | `/api/auth/extension-session` | Cấp phiên riêng cho từng bản cài extension (device-scoped) | Public |
| `POST` | `/api/auth/ws-token` | Cấp token WebSocket ngắn hạn (1 giờ) | Bearer Token |
| `WS` | `/api/live/stream?token=...` | Live-Caption: nhận audio micro và trả phụ đề trực tiếp | WS token |
| `GET` | `/api/auth/export-data` | Xuất toàn bộ dữ liệu cá nhân dạng JSON | Bearer Token |
| `DELETE` | `/api/auth/account` | Vô hiệu hoá tài khoản (xoá mềm, giữ dữ liệu; mật khẩu bắt buộc với tài khoản email) | Bearer Token |
| `GET` | `/api/admin/users` | Liệt kê tài khoản đang bị vô hiệu hoá | `X-Admin-Token` |
| `POST` | `/api/admin/users/{id}/restore` | Khôi phục tài khoản xoá mềm, giữ nguyên dữ liệu | `X-Admin-Token` |
| `GET` | `/api/export` | Xuất tài liệu bài giảng (`?video_url=...&format=pdf\|docx\|md`) | Bearer Token |
| `GET` | `/health` | Liveness probe (tiến trình còn sống) | Public |
| `GET` | `/health/ready` | Readiness probe (Firebase, thư mục upload, JWT secret) | Public |
| `GET` | `/metrics` | Số liệu vận hành dạng Prometheus text | Public (dev) / `METRICS_TOKEN` (production) |

> Mọi endpoint `/api/...` có thêm alias `/api/v1/...`; response mang header
> `X-API-Version: 1`. Response JSON/text lớn hơn 1KB được nén gzip, còn luồng
> `audio/*` và `video/*` được giữ nguyên để không phá Range Request.
> Các endpoint bị giới hạn tần suất trả `429` kèm header `Retry-After` (giây)
> để client biết thời điểm thử lại.

---

## 🔒 BẢO MẬT & QUYỀN RIÊNG TƯ

1. **Bảo mật danh tính & Mật khẩu:** Toàn bộ mật khẩu được mã hóa băm một chiều an toàn bằng **PBKDF2-HMAC-SHA256** (240.000 vòng, salt ngẫu nhiên 16 byte). Phiên làm việc dùng **access token ngắn hạn** (mặc định 60 phút) và **refresh token** (mặc định 30 ngày) được xoay mỗi lần làm mới; trường `token_version` cho phép thu hồi toàn bộ phiên khi đổi/đặt lại mật khẩu hoặc xoá tài khoản. Refresh token cũ bị dùng lại sau `REFRESH_REPLAY_GRACE_SECONDS` (mặc định 300 giây) bị coi là bị đánh cắp và thu hồi toàn bộ phiên; trong khoảng grace, các client refresh đồng thời không bị đăng xuất oan.
2. **Xác thực bảo vệ bằng mã OTP:** Quy trình xác minh email/khôi phục tài khoản sử dụng mã 6 chữ số ngẫu nhiên, chỉ lưu dưới dạng **HMAC-SHA256**, giới hạn số lần nhập sai và hết hạn sau 10 phút. Ở production, thiếu SMTP hoặc gửi mail lỗi sẽ **fail-closed**, không tự kích hoạt tài khoản.
3. **Quyền riêng tư dữ liệu:** Dữ liệu phụ đề và ghi chú cá nhân của từng học viên được phân tách độc lập theo `owner_id` trên Google Cloud Firestore. Cache đọc theo `owner_id` không fallback sang bản toàn cục; bản toàn cục chỉ giữ nội dung suy ra từ video công khai.
4. **Chống SSRF:** URL video được kiểm tra allowlist và phân giải DNS; mọi địa chỉ loopback, private, link-local hoặc metadata cloud đều bị từ chối. Proxy stream yêu cầu Bearer Token hoặc media token và kiểm tra lại từng bước redirect.
5. **Bản quyền phương tiện:** Hệ thống tôn trọng quyền sở hữu trí tuệ của tác giả video; toàn bộ quá trình trích xuất âm thanh và bóc tách nội dung phục vụ thuần túy cho mục đích nghiên cứu học thuật phi thương mại.
6. **Chống dò tài khoản:** Đăng nhập luôn chạy PBKDF2 (kể cả khi không tìm thấy tài khoản) để cân bằng thời gian phản hồi; các luồng quên mật khẩu/gửi lại OTP trả thông báo trung tính, không tiết lộ email đã đăng ký hay chưa. Độ dài email/mật khẩu/OTP được giới hạn ở tầng schema để tránh payload quá lớn.
7. **Xác minh email không thay thế đăng nhập:** `/api/auth/verify-otp` chỉ kích hoạt tài khoản; tài khoản đã xác minh không thể dùng endpoint này để lấy phiên mà phải đăng nhập bằng mật khẩu. Media token cũng mang `token_version` nên bị thu hồi ngay khi đổi/đặt lại mật khẩu hoặc đăng xuất toàn bộ.

---

## 📄 GIẤY PHÉP (LICENSE)

Dự án được phân phối dưới giấy phép mã nguồn mở **[MIT License](LICENSE)**. Toàn bộ mã nguồn phục vụ mục đích nghiên cứu, học tập và phát triển ứng dụng tại **Trường Đại học Lạc Hồng (LHU)**.
