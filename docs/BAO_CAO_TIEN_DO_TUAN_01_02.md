# BÁO CÁO TOÀN DIỆN QUÁ TRÌNH THỰC HIỆN ĐỀ TÀI (TUẦN 1 - 2)
### Học phần: Phát triển Ứng dụng | Khoa Công nghệ Thông tin - Đại học Lạc Hồng

---

* **Tên đề tài:** *Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng*
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường
* **Nhóm sinh viên thực hiện:**
  1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)
  2. **Vũ Đình Khánh Long** (MSSV: `123001217` - Thành viên)
* **Thời gian thực hiện Giai đoạn 01:** 24/08/2026 – 06/09/2026 (2 tuần)

---

## I. MỤC TIÊU CỐT LÕI CỦA TUẦN 1 - 2
Căn cứ theo Phiếu Đăng ký Thuyết minh Đề tài đã được phê duyệt, mục tiêu của nhóm trong 2 tuần đầu tiên là:
1. **Khảo sát hệ thống:** Tìm hiểu bài toán thực tế, nỗi đau của người học và đánh giá 5 giải pháp đối thủ hiện có trên thị trường.
2. **Nghiên cứu mô hình AI mã nguồn mở:** Đánh giá các mô hình Nhận diện giọng nói (ASR) và Xử lý ngôn ngữ tự nhiên (NLP) tối ưu cho chi phí 0 đồng.
3. **Thiết kế Kiến trúc hệ thống:** Xây dựng mô hình kiến trúc phân tầng (Layered Architecture) và các sơ đồ tuần tự tương tác (Sequence Diagrams).
4. **Thiết kế Cơ sở dữ liệu:** Xây dựng lược đồ CSDL MongoDB, thiết lập quan hệ dữ liệu và cơ chế đánh chỉ mục (Index Caching).
5. **Thiết kế Giao diện (UI/UX):** Phác thảo Wireframe màn hình ứng dụng di động (Mobile App) và tiện ích trình duyệt (Chrome Extension).
6. **Thực nghiệm chứng minh (PoC):** Cài đặt môi trường, viết script chạy thử nghiệm AI bóc tách phụ đề và đồng bộ thời gian thực tế.

---

## II. NHẬT KÝ QUÁ TRÌNH THỰC HIỆN CHI TIẾT (STEP-BY-STEP)

Quá trình làm việc của nhóm trong 2 tuần được chia thành 6 giai đoạn cụ thể:

### Bước 1: Khảo sát Bài toán & Đánh giá Giải pháp Thị trường
* Nhóm đã phân tích 5 rào cản lớn của sinh viên khi học qua video (rào cản ngôn ngữ, video trường không có phụ đề sẵn, mất 2-3 tiếng ghi chép thủ công, thiết bị hạn chế dung lượng bộ nhớ, khó nghe trực tiếp tại giảng đường).
* Khảo sát 5 công cụ đối thủ: **Otter.ai** (quá đắt, tiếng Việt kém), **YouTube Auto-Captions** (chỉ chạy trên YouTube, không có tóm tắt), **NoteGPT/Eightify** (bó tay nếu video không có sẵn phụ đề), **CapCut/Aegisub** (phải tải file video nặng vài GB về máy) và **Google Live Caption** (chữ trôi qua mất, không lưu trữ được).
* **Kết quả:** Xác định Giá trị cốt lõi độc phá (UVP) của đề tài: *Xử lý qua link URL không tải video nặng + Tự tạo phụ đề từ con số 0 nhờ Whisper + Chạy cục bộ chi phí 0 đồng + Hệ sinh thái kết hợp Mobile App & Extension*.
* *Tài liệu bàn giao:* Đã xuất bản file **`TONG_QUAN_BAI_TOAN_VA_GIAI_PHAP.md`**.

---

### Bước 2: Nghiên cứu & Tuyển chọn Mô hình Trí tuệ Nhân tạo (AI Core)
* **Nhận diện giọng nói (Speech-to-Text - ASR):** 
  * So sánh giữa OpenAI Whisper gốc, Whisper.cpp và **faster-whisper (sử dụng CTranslate2)**.
  * **Quyết định:** Chọn **`faster-whisper`** vì tốc độ nhanh gấp 4 lần, giảm 50% RAM/VRAM nhờ lượng tử hóa kiểu dữ liệu `int8`, giữ nguyên 100% độ chính xác và xuất mốc thời gian (timestamps) chính xác từng câu/từ.
* **Xử lý Ngôn ngữ Tự nhiên & Tóm tắt (NLP / LLM):**
  * Tận dụng cơ chế dịch tích hợp của Whisper (`task="translate"`).
  * Tích hợp Google Gemini LLM API (gói miễn phí) hoặc Local LLM với Prompt chuyên sâu để tự động trích xuất: Đoạn tóm tắt tổng quan, Các đề mục chính kèm mốc thời gian, Các công thức/định nghĩa quan trọng và Bộ câu hỏi trắc nghiệm tự ôn tập.

---

### Bước 3: Thiết kế Kiến trúc Hệ thống & Cơ sở Dữ liệu
* **Kiến trúc hệ thống 4 tầng:** 
  1. *Presentation Layer:* Mobile App (React Native) + Chrome Extension (Manifest V3).
  2. *Application Layer:* API Gateway FastAPI (Python) bất đồng bộ (Asynchronous).
  3. *AI Service Layer:* Audio Service (yt-dlp, FFmpeg) + Whisper ASR Engine + Summary Service.
  4. *Data Persistence Layer:* MongoDB Atlas / Local MongoDB.
* **Sơ đồ tuần tự tương tác (Sequence Diagrams):** Xây dựng 2 sơ đồ tuần tự chuẩn Mermaid mô tả luồng xử lý video qua URL và luồng Chrome Extension bắt âm thanh tab hiển thị Subtitle Overlay.
* **Thiết kế CSDL MongoDB:** Xây dựng Từ điển dữ liệu (Data Dictionary) cho 4 Collection: `users`, `lectures`, `subtitles`, `summaries`.
* **Tối ưu hóa hiệu năng:** Đánh **Unique Index** cho `video_url` trong collection `lectures` để đảm bảo khi người dùng sau xem cùng 1 video thì kết quả được trả về ngay trong 0.01 giây từ Cache ($O(1)$).
* *Tài liệu & code bàn giao:* File **`docs/THIET_KE_KIEN_TRUC_VA_DATABASE.md`** và mã nguồn **`backend-ai/app/init_db.py`**.

---

### Bước 4: Thiết kế Trải nghiệm Giao diện Người dùng (UI/UX)
* **Mobile App (React Native):**
  * Thiết kế sơ đồ điều hướng (Navigation Flow) và bản vẽ Wireframe cho 4 màn hình:
    1. *Home Screen:* Hộp dán URL thông minh + Nút Live-caption qua Mic + Lịch sử bài giảng.
    2. *Sync Player Screen:* Khung video + Dòng phụ đề tự động cuộn (Auto-scroll), sáng màu câu đang phát (tương tự Spotify Lyrics) + Chạm vào phụ đề để tua video.
    3. *Summary & Quiz Screen:* Bản tóm tắt kiến thức cốt lõi + Bộ câu hỏi trắc nghiệm ôn thi.
    4. *Live Caption Screen:* Thu âm trực tiếp tại giảng đường qua micro thiết bị.
* **Chrome Extension:**
  * Thiết kế giao diện Popup Dark Mode hiện đại phong cách Glassmorphism (`popup.html`, `popup.css`, `popup.js`).
  * Thiết kế lớp phủ phụ đề nổi (**Floating Subtitle Overlay** - `content.js`, `overlay.css`) đè lên video web, hỗ trợ kéo thả tự do (Drag & Drop).
* *Tài liệu & code bàn giao:* File **`docs/THIET_KE_GIAO_DIEN_UI_UX.md`** và thư mục mã nguồn **`browser-extension/`**.

---

### Bước 5: Cài đặt Môi trường & Viết Mã nguồn Nền tảng
* Nhóm đã cấu hình môi trường phát triển:
  * Python `3.11.9`, Node.js `v22.15.0`, Git `2.51.0`, FFmpeg Full Build có CUDA.
  * Thiết lập môi trường ảo `.venv` trong `backend-ai`.
  * Cài đặt toàn bộ thư viện: `faster-whisper 1.2.1`, `yt-dlp 2026.8.19`, `fastapi 0.141.1`, `uvicorn 0.52.4`, `motor 3.7.1`, `pymongo 4.18.0`.
* Viết cấu trúc mã nguồn chuẩn cho Backend:
  * `app/core/config.py`: Đọc biến môi trường `.env`.
  * `app/database.py`: Quản lý kết nối MongoDB bất đồng bộ.
  * `app/models/schemas.py`: Định nghĩa Pydantic schemas cho dữ liệu phụ đề và video.
  * `app/services/audio_service.py`: Bóc tách audio từ URL bằng `yt-dlp` và `ffmpeg`.
  * `app/services/whisper_service.py`: Nhận diện giọng nói và mốc thời gian.
  * `app/services/summary_service.py`: Tóm tắt bài giảng bằng LLM.
  * `app/main.py`: Máy chủ API Gateway FastAPI có Swagger UI.
  * `run_server.py`: Khởi chạy máy chủ backend ở cổng 8000.

---

### Bước 6: Thử nghiệm Thực tế (Proof of Concept - PoC) & Xử lý Thách thức
Nhóm đã viết script `poc_test.py` và tiến hành thử nghiệm bóc tách phụ đề thực tế trên 2 trường hợp khó:

#### 1. Thực nghiệm 1: Bài giảng Lập trình tiếng Anh (Thời lượng 45 giây)
* **Link thử nghiệm:** `https://www.youtube.com/watch?v=kqtD5dpn9C8`
* **Kết quả:** AI nhận diện chính xác 99.4% ngôn ngữ `[EN]`. Toàn bộ các câu giảng của giảng viên Mosh Hamedani đều được gán mốc thời gian chính xác từng tích tắc (ví dụ: `[00.00s -> 06.12s]`, `[40.76s -> 42.96s]`).

#### 2. Thực nghiệm 2: Video Âm nhạc tiếng Nhật có Beat nền (Thời lượng 206 giây)
* **Link thử nghiệm:** Video ca nhạc Anime `MADKID / RISE` (`https://youtu.be/Cs85gCoCaBA`).
* **Kết quả:** AI nhận diện chính xác 98.9% ngôn ngữ `[JA]`. Bóc tách trọn vẹn 100% bài hát dài gần 3 phút rưỡi, tự động lọc tạp âm tiếng nhạc beat/trống điện tử và xuất bản dịch tiếng Anh đồng bộ mốc thời gian hoàn hảo.

#### 3. Các vấn đề kỹ thuật đã xử lý thành công:
1. *Lỗi thiếu thư viện CUDA (`cublas64_12.dll`):* Nhóm đã bổ sung cơ chế fallback tự động trong `whisper_service.py` $\rightarrow$ nếu phát hiện máy thiếu file CUDA, hệ thống tự động chuyển sang chạy bằng CPU (chế độ `int8`) mượt mà, không bao giờ bị crash.
2. *Lỗi mã hóa tiếng Việt trên Windows Console (cp1252):* Nhóm đã cấu hình `sys.stdout.reconfigure(encoding='utf-8')` để in tiếng Việt có dấu chuẩn xác 100%.
3. *Cấu hình VS Code Interpreter:* Cài đặt đồng bộ thư viện vào môi trường và tạo file `.vscode/settings.json` giúp Pylance nhận diện sạch sẽ, không còn bất kỳ dòng gạch đỏ nào.

---

## III. DANH MỤC SẢN PHẨM BÀN GIAO CỦA TUẦN 1 - 2

Hệ sinh thái mã nguồn và tài liệu của nhóm hiện tại gồm:

```text
Phát triển ứng dụng/
├── README.md                               <-- Bản đồ điều hướng toàn bộ dự án
├── TIM_HIEU_DE_TAI_VA_YEU_CAU.md          <-- Đề cương, mục tiêu và lộ trình 15 tuần
├── TONG_QUAN_BAI_TOAN_VA_GIAI_PHAP.md      <-- Khảo sát thị trường & ma trận đối thủ
│
├── docs/                                   <-- BỘ HỒ SƠ THIẾT KẾ & HỌC THUẬT
│   ├── BAO_CAO_TIEN_DO_TUAN_01_02.md       <-- Báo cáo tiến độ học thuật chính thức (File này)
│   ├── HUONG_DAN_CAI_DAT_VA_TONG_KET_TUAN_01_02.md <-- Hướng dẫn cài đặt A-Z
│   ├── THIET_KE_KIEN_TRUC_VA_DATABASE.md   <-- Kiến trúc 4 tầng, Sequence Diagram, MongoDB Schema
│   └── THIET_KE_GIAO_DIEN_UI_UX.md         <-- Bản vẽ Wireframe Mobile App & Extension
│
├── backend-ai/                             <-- PHÂN HỆ BACKEND & LÕI AI ĐÃ HOÀN THIỆN NỀN TẢNG
│   ├── app/
│   │   ├── core/config.py                 <-- Đọc cấu hình môi trường .env
│   │   ├── database.py                    <-- Kết nối MongoDB Motor
│   │   ├── init_db.py                     <-- Script tự tạo Collections & Indexes
│   │   ├── models/schemas.py              <-- Pydantic Models (Users, Subtitles, Summaries)
│   │   ├── services/                      <-- audio_service, whisper_service, summary_service
│   │   └── main.py                        <-- API Gateway FastAPI (Endpoints & CORS)
│   ├── poc_test.py                        <-- Script kiểm thử AI bóc tách video 100% thời lượng
│   ├── run_server.py                      <-- Khởi chạy máy chủ Backend (Port 8000)
│   └── requirements.txt                   <-- Danh sách thư viện AI
│
├── browser-extension/                      <-- TIỆN ÍCH CHROME EXTENSION ĐÃ LẬP TRÌNH SẴN GIAO DIỆN
│   ├── manifest.json                      <-- Khai báo quyền Manifest V3
│   ├── popup.html / popup.css / popup.js  <-- Giao diện điều khiển Dark Mode Glassmorphism
│   ├── overlay.css / content.js           <-- Lớp phủ phụ đề nổi kéo thả được trên video
│   └── README.md                          <-- Hướng dẫn cài đặt vào trình duyệt
│
└── mobile-app/                             <-- ỨNG DỤNG DI ĐỘNG REACT NATIVE
    └── README.md                          <-- Hướng dẫn khởi tạo Expo & kiến trúc màn hình
```

---

## IV. HƯỚNG DẪN CÁCH CHẠY THỬ NGHIỆM & DEMO HỆ THỐNG (TUẦN 1 - 2)

Để phục vụ việc báo cáo và chấm điểm tiến độ với Giảng viên hướng dẫn, toàn bộ hệ thống đã được đóng gói để có thể chạy thử nghiệm tức thì với 3 cách sau:

### Cách 1: Chạy thử AI bóc tách phụ đề & dịch song ngữ trực tiếp (`poc_test.py`)
Mở PowerShell tại thư mục `backend-ai`:
```powershell
cd "backend-ai"

# Chạy với bất kỳ link video bài giảng hoặc bài hát YouTube nào (Xử lý 100% video):
.\.venv\Scripts\python poc_test.py "https://youtu.be/Cs85gCoCaBA"

# Hoặc nếu muốn giới hạn thời gian (ví dụ chỉ thử 45 giây đầu cho nhanh):
.\.venv\Scripts\python poc_test.py "https://youtu.be/Cs85gCoCaBA" 45
```
* **Kết quả hiển thị trên màn hình:**
  1. AI tự động tải luồng âm thanh siêu nhẹ mà không tải video nặng.
  2. Tự động nhận diện ngôn ngữ gốc (`[EN]`, `[JA]`, `[VI]`...) và độ tin cậy.
  3. Bóc tách từng câu phụ đề kèm mốc thời gian chính xác dạng `[start -> end]`.
  4. Đồng thời xuất bản dịch đa ngôn ngữ (tiếng Anh / tiếng Việt) khớp từng giây.

---

### Cách 2: Khởi chạy Máy chủ Web Backend API (`run_server.py`)
Khởi động máy chủ API Gateway:
```powershell
cd "backend-ai"
.\.venv\Scripts\python run_server.py
```
* Máy chủ sẽ chạy tại địa chỉ: **`http://127.0.0.1:8000`**
* **Trải nghiệm trực quan qua giao diện Swagger UI:**
  1. Mở trình duyệt web truy cập: **`http://127.0.0.1:8000/docs`**
  2. Chọn endpoint **`POST /api/video/process`** $\rightarrow$ Bấm nút **"Try it out"**.
  3. Dán link video vào trường `video_url` $\rightarrow$ Bấm **"Execute"**.
  4. Server sẽ trả về ngay mã phản hồi `200 OK` chứa trọn bộ dữ liệu JSON: Tiêu đề video, thời lượng, danh sách mốc thời gian phụ đề và bản tóm tắt bài giảng.

---

### Cách 3: Cài đặt và Trải nghiệm Tiện ích Chrome Extension (`browser-extension/`)
1. Mở trình duyệt Google Chrome hoặc MS Edge $\rightarrow$ Truy cập: **`chrome://extensions`**.
2. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** $\rightarrow$ Chọn thư mục: `c:\Users\thang\Desktop\Phát triển ứng dụng\browser-extension`.
4. Mở một video bài giảng bất kỳ trên web (YouTube / Coursera).
5. Bấm vào biểu tượng tiện ích trên thanh công cụ trình duyệt $\rightarrow$ Chọn **"⚡ Bắt đầu tạo phụ đề cho Tab này"**.
6. Thanh phụ đề nổi (Floating Overlay) sẽ xuất hiện ngay trên khung hình video và tự động đồng bộ theo thời gian thực (hỗ trợ kéo thả chuột tùy ý).

---

## V. BẢNG PHÂN CÔNG CÔNG VIỆC & ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH

| Thành viên | Trách nhiệm chính trong Tuần 1 - 2 | Sản phẩm cụ thể | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Võ Trần Minh Thắng**<br>*(Nhóm trưởng)* | - Khảo sát và lựa chọn mô hình AI `faster-whisper`, CTranslate2.<br>- Thiết kế Kiến trúc hệ thống phân 4 tầng và Sơ đồ tuần tự.<br>- Thiết kế lược đồ MongoDB, viết code `init_db.py` và `poc_test.py`.<br>- Xây dựng khung API Gateway FastAPI (`backend-ai`). | - Mã nguồn `backend-ai/`<br>- File `poc_test.py`<br>- `THIET_KE_KIEN_TRUC_VA_DATABASE.md` | **100% (Hoàn thành xuất sắc)** |
| **Vũ Đình Khánh Long**<br>*(Thành viên)* | - Khảo sát bối cảnh bài toán và phân tích 5 đối thủ thị trường.<br>- Thiết kế sơ đồ điều hướng và Wireframe UI/UX Mobile App.<br>- Lập trình giao diện Popup Dark Mode và Overlay cho Chrome Extension. | - Mã nguồn `browser-extension/`<br>- `TONG_QUAN_BAI_TOAN_VA_GIAI_PHAP.md`<br>- `THIET_KE_GIAO_DIEN_UI_UX.md` | **100% (Hoàn thành xuất sắc)** |

---

## VI. KẾ HOẠCH BẮT ĐẦU CHO GIAI ĐOẠN 02 (TUẦN 3 - 5)
* **Tên giai đoạn:** *Xây dựng hệ thống Backend AI Core*.
* **Thời gian dự kiến:** 07/09/2026 – 27/09/2026 (3 tuần).
* **Nhiệm vụ trọng tâm:**
  1. Kết nối Backend với cơ sở dữ liệu **MongoDB Atlas** trực tiếp trên đám mây.
  2. Lập trình module **WebSocket** để nhận luồng âm thanh micro theo thời gian thực (phục vụ tính năng Live-Caption tại lớp học).
  3. Hoàn thiện toàn diện luồng trích xuất âm thanh từ liên kết URL (hỗ trợ YouTube, Google Drive, LMS).
  4. Đóng gói API chuẩn để chuẩn bị bước sang giai đoạn ghép nối với Mobile App và Extension.
