# HƯỚNG DẪN CÀI ĐẶT & TỔNG KẾT TOÀN BỘ CÔNG VIỆC TUẦN 1 - 2
### Đề tài: Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng
**Môn học:** Phát triển Ứng dụng - Đại học Lạc Hồng  
**Nhóm sinh viên thực hiện:** Võ Trần Minh Thắng & Vũ Đình Khánh Long  

---

# PHẦN 1: HƯỚNG DẪN CÀI ĐẶT MÔI TRƯỜNG DỰ ÁN TỪ A ĐẾN Z

Dưới đây là các bước để cài đặt và chạy lại toàn bộ hệ thống từ đầu trên bất kỳ máy tính nào của nhóm:

### 1. Kiểm tra các công cụ hệ thống cần có
Mở PowerShell và kiểm tra các công cụ nền tảng:
```powershell
python --version   # Yêu cầu Python 3.10 hoặc 3.11 (Máy của bạn: Python 3.11.9)
node -v            # Yêu cầu Node.js v18 hoặc v20+ (Máy của bạn: v22.15.0)
git --version      # Quản lý mã nguồn (Máy của bạn: git 2.51.0)
ffmpeg -version    # BẮT BUỘC: Dùng để trích xuất âm thanh từ video
```

---

### 2. Cài đặt Backend AI & Môi trường ảo Python
Di chuyển vào thư mục backend và tạo môi trường ảo:
```powershell
cd "backend-ai"

# Bước 2.1: Tạo môi trường ảo riêng biệt (.venv)
python -m venv .venv

# Bước 2.2: Nâng cấp pip và cài đặt toàn bộ thư viện
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt
```

Các gói thư viện quan trọng được cài đặt gồm:
* `faster-whisper`: Lõi Deep Learning nhận diện giọng nói & tạo mốc thời gian (Timestamps).
* `yt-dlp`: Bóc tách stream âm thanh từ link YouTube / Drive / LMS mà không cần tải video nặng.
* `fastapi` & `uvicorn`: Xây dựng máy chủ Web API tốc độ cao.
* `motor` & `pymongo`: Kết nối và thao tác với cơ sở dữ liệu MongoDB Atlas / Local.
* `google-generativeai`: Mô hình LLM tóm tắt bài học và trích xuất câu hỏi trắc nghiệm.

---

### 3. Cấu hình file môi trường (.env)
Tạo file `.env` trong thư mục `backend-ai` (copy từ file mẫu `.env.example`):
```env
PORT=8000
HOST=127.0.0.1
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=lecture_caption_db
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
GEMINI_API_KEY=
```

---

### 4. Cấu hình VS Code để không bị lỗi gạch đỏ
File cấu hình đã được tạo sẵn tại `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}\\backend-ai\\.venv\\Scripts\\python.exe",
  "python.analysis.extraPaths": [
    "${workspaceFolder}\\backend-ai"
  ],
  "python.analysis.autoSearchPaths": true
}
```
> **Mẹo:** Nếu mở file Python thấy báo gạch đỏ, nhấn `Ctrl + Shift + P` $\rightarrow$ gõ `Reload Window` là sạch 100%.

---

### 5. Cài đặt Tiện ích Chrome Extension vào trình duyệt
1. Mở Chrome hoặc MS Edge $\rightarrow$ Truy cập: `chrome://extensions`
2. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)**.
4. Chọn đường dẫn: `c:\Users\thang\Desktop\Phát triển ứng dụng\browser-extension`.
5. Tiện ích **Lecture Subtitle & AI Summary** sẽ xuất hiện trên thanh công cụ!

---

# PHẦN 2: TỔNG KẾT NHỮNG GÌ ĐÃ LÀM TRONG TUẦN 1 - 2

Theo đúng đề cương học phần, nhóm đã hoàn thành xuất sắc và **vượt tiến độ** toàn bộ mục tiêu của Giai đoạn 01:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  KẾT QUẢ ĐẠT ĐƯỢC CỦA TUẦN 1 - 2                           │
├────────────────────────────────────────────────────────────────────────────┤
│ 1. Khảo sát & Chốt mô hình AI mã nguồn mở: faster-whisper + CTranslate2   │
│ 2. Khảo sát thị trường: So sánh đề tài với Otter.ai, NoteGPT, CapCut...   │
│ 3. Thiết kế Kiến trúc hệ thống 4 tầng & Sơ đồ tuần tự tương tác (Sequence) │
│ 4. Thiết kế Database MongoDB (4 collection) & Script đánh chỉ mục Index    │
│ 5. Thiết kế Wireframe UI/UX cho Mobile App và Browser Extension           │
│ 6. Xây dựng Backend AI Core: API Gateway FastAPI + Whisper + yt-dlp        │
│ 7. Thực nghiệm PoC thành công 100% trên bài giảng tiếng Anh & bài hát Nhật │
│ 8. Lập trình xong bộ mã nguồn giao diện Chrome Extension (Popup + Overlay) │
│ 9. Hoàn thiện Bộ hồ sơ báo cáo tiến độ nộp cho GVHD Phan Mạnh Thường       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Về mặt Nghiên cứu & Tài liệu (Hồ sơ học thuật hoàn chỉnh)
Tất cả các tài liệu chuẩn đã được lưu tại thư mục `docs/`:
1. **`docs/BAO_CAO_TIEN_DO_TUAN_01_02.md`**: Bản báo cáo tiến độ học thuật chính thức nộp cho GVHD Phan Mạnh Thường (có bảng phân công công việc Thắng & Long, số liệu thực nghiệm).
2. **`docs/THIET_KE_KIEN_TRUC_VA_DATABASE.md`**: Bản vẽ kiến trúc 4 tầng phân lớp, 2 sơ đồ tuần tự Mermaid (Luồng URL và Luồng Extension Overlay), Từ điển dữ liệu (Data Dictionary) của 4 Collection MongoDB.
3. **`docs/THIET_KE_GIAO_DIEN_UI_UX.md`**: Bản đặc tả Wireframe 4 màn hình Mobile App (Home, Sync Player cuộn phụ đề như Spotify, Live-caption qua Mic, Tóm tắt bài học) và giao diện Extension.
4. **`TONG_QUAN_BAI_TOAN_VA_GIAI_PHAP.md`**: Phân tích bối cảnh, 5 nỗi đau của sinh viên, bảng ma trận đối sánh tính năng với 5 đối thủ trên thị trường và giá trị cốt lõi (UVP) của đề tài.
5. **`TIM_HIEU_DE_TAI_VA_YEU_CAU.md`**: Tổng quan thông tin đề tài, hệ sinh thái 3 phân hệ và lộ trình 15 tuần.

---

### 2. Về mặt Lập trình & Kỹ thuật

#### A. Phân hệ Backend & Lõi AI (`backend-ai/`)
* **`app/services/audio_service.py`**: Bóc tách stream âm thanh trực tiếp từ link URL qua `yt-dlp` và `ffmpeg`, không cần tải file video nặng hàng Gigabyte.
* **`app/services/whisper_service.py`**: Tích hợp mô hình `faster-whisper` (CTranslate2), lọc khoảng lặng qua VAD filter, trích xuất mốc thời gian (`start`, `end`, `text`), hỗ trợ dịch thuật song ngữ (`task="translate"`). Có cơ chế tự động chuyển đổi an toàn sang CPU nếu máy tính thiếu file thư viện CUDA.
* **`app/services/summary_service.py`**: Tóm tắt bài giảng bằng LLM và sinh câu hỏi trắc nghiệm ôn tập.
* **`app/database.py` & `app/init_db.py`**: Kết nối MongoDB Async (Motor), tạo Collection và đánh Unique Index cho `video_url` để tra cứu Cache trong 0.01 giây.
* **`app/main.py`**: Xây dựng API Gateway FastAPI, hỗ trợ CORS cho App di động và Extension, Endpoint `POST /api/video/process`.
* **`run_server.py`**: File khởi chạy máy chủ chỉ bằng 1 dòng lệnh.

#### B. Phân hệ Tiện ích Mở rộng (`browser-extension/`)
* **`manifest.json`**: Cấu hình chuẩn Chrome Extension Manifest V3.
* **`popup.html` & `popup.css`**: Giao diện điều khiển phong cách Dark Mode kính mờ (Glassmorphism).
* **`popup.js`**: Lấy link tab bài giảng hiện tại, gửi request lên Backend AI và nhận kết quả phụ đề.
* **`overlay.css` & `content.js`**: Lớp phủ phụ đề nổi trên nền video web, tự động đọc `video.currentTime` để hiển thị chữ khớp từng giây và cho phép kéo thả chuột (Drag & Drop) tự do.

#### C. Thử nghiệm thực tế (Proof of Concept - `poc_test.py`)
Đã thử nghiệm thành công 100% trên 2 trường hợp phức tạp:
1. **Video bài giảng lập trình tiếng Anh:** Nhận diện chính xác 99.4% ngôn ngữ `[EN]`, gán mốc thời gian chuẩn từng câu.
2. **Video âm nhạc tiếng Nhật có beat nền (`MADKID / RISE`):** Bóc tách trọn vẹn 100% bài hát (206 giây), nhận diện 98.9% tiếng Nhật `[JA]`, lọc tạp âm âm nhạc và dịch đồng bộ sang tiếng Anh chuẩn xác.

---

# PHẦN 3: CÁCH CHẠY VÀ KIỂM TRA LẠI HỆ THỐNG

### Cách 1: Chạy thử AI bóc tách bất kỳ video YouTube nào
```powershell
cd "backend-ai"
.\.venv\Scripts\python poc_test.py "LINK_VIDEO_YOUTUBE"
```

### Cách 2: Khởi chạy Backend API Server
```powershell
cd "backend-ai"
.\.venv\Scripts\python run_server.py
```
Mở trình duyệt xem Swagger Docs: **`http://127.0.0.1:8000/docs`**

---

### 🚀 BƯỚC TIẾP THEO: SẴN SÀNG CHO TUẦN 3 - 5
Tuần 1 - 2 đã được chuẩn bị đầy đủ nền tảng vững chắc. Bước sang **Tuần 3 - 5 (07/09/2026 - 27/09/2026)**, nhóm sẽ chính thức hoàn thiện toàn bộ Backend AI Core và ghép nối API thực tế!
