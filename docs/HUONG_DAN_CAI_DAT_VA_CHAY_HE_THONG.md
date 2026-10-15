# HƯỚNG DẪN CÀI ĐẶT & CHẠY HỆ THỐNG TOÀN DIỆN
### Đề tài: Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng
* **Học phần:** Phát triển Ứng dụng | Đại học Lạc Hồng (LHU)
* **Nhóm sinh viên thực hiện:** Võ Trần Minh Thắng (Nhóm trưởng) & Vũ Đình Khánh Long
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường

---

## 📌 PHẦN 1: HỆ THỐNG ĐÃ CÀI ĐẶT NHỮNG GÌ?

Toàn bộ hệ thống Backend AI Core đã được thiết lập hoàn chỉnh với các công cụ, thư viện và dịch vụ đám mây sau:

### 1. Công cụ nền tảng hệ điều hành (System Prerequisites)
* **Python 3.11.9:** Ngôn ngữ lập trình chính cho toàn bộ hệ thống Backend AI.
* **FFmpeg:** Công cụ bóc tách âm thanh, chuẩn hóa audio về chuẩn 16kHz Mono tối ưu cho Whisper AI.
* **Node.js (v22.15.0) & Git:** Quản lý môi trường và mã nguồn dự án.

### 2. Các thư viện Python cốt lõi (`backend-ai/requirements.txt`)
* **`fastapi` (>=0.110.0) & `uvicorn`:** Framework xây dựng máy chủ Web API tốc độ cao, hỗ trợ CORS và tự động sinh tài liệu Swagger UI tại `/docs`.
* **`python-multipart`:** Xử lý tiếp nhận file video/audio tải lên trực tiếp từ máy tính (`POST /api/video/upload`).
* **`faster-whisper`:** Lõi Trí tuệ nhân tạo (ASR) nhận diện giọng nói và gán mốc thời gian (timestamps) chuẩn xác, tối ưu chạy trên CPU (`int8`) hoặc GPU NVIDIA.
* **`yt-dlp`:** Bóc tách stream âm thanh siêu nhẹ trực tiếp từ URL (YouTube, Drive, LMS) mà không cần tải cả video nặng.
* **`firebase-admin` (>=7.5.0):** Kết nối **Google Firebase Cloud Firestore** làm kho lưu trữ vĩnh cửu và bộ nhớ đệm Cache $O(1)$ tiết kiệm 100% Token AI.
* **`google-generativeai`:** Kết nối mô hình **Gemini 2.5 Flash** (kèm fallback **Gemini 2.0 Flash**) tóm tắt bài học (Tổng quan, Điểm cốt lõi, Thuật ngữ, Trắc nghiệm).
* **`requests`:** Module dịch thuật đa ngôn ngữ song ngữ song song, giữ nguyên mốc thời gian của từng câu.

### 3. Các dịch vụ Đám mây (Cloud Services) đã kích hoạt
* **Google Firebase Cloud Firestore:** Dự án `ptud-dt012`, kết nối thông qua file khóa `backend-ai/serviceAccountKey.json`.
* **Google Gemini AI:** Đã cấu hình khóa `GEMINI_API_KEY` sử dụng mô hình `gemini-2.5-flash` và tự động fallback `gemini-2.0-flash`.

---

## 📌 PHẦN 2: HƯỚNG DẪN CÁCH CHẠY HỆ THỐNG TỪ A ĐẾN Z

### Cách 1: Khởi động Máy chủ Backend AI & Sử dụng Swagger UI (Khuyên dùng)

#### Bước 1: Khởi động máy chủ
Mở PowerShell tại thư mục dự án và chạy:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"
.\.venv\Scripts\python run_server.py
```
*Khi màn hình hiện thông báo sau là máy chủ đã sẵn sàng 100%:*
```
INFO: Khởi tạo Firebase Admin SDK thành công!
INFO: Kết nối Google Firebase Cloud Firestore THÀNH CÔNG! Sẵn sàng làm Kho Cache vĩnh cửu.
INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

#### Bước 2: Mở giao diện kiểm thử Swagger UI
Mở trình duyệt web và truy cập: 👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

#### Bước 3: Sử dụng các API chính
1. **Xử lý video từ URL (`POST /api/video/process`):**
   * Bấm vào nút **Try it out**, dán đoạn JSON:
     ```json
     {
       "video_url": "https://youtu.be/dxvTSf-k23k?si=vowa_TPbX968ARJx",
       "max_duration_seconds": 20,
       "source_language": "auto",
       "target_language": "vi"
     }
     ```
     *(Xóa dòng `max_duration_seconds` nếu muốn xử lý toàn bộ 100% video)*.
   * Bấm **Execute**: Hệ thống trả về phụ đề chi tiết từng giây, bản tóm tắt bài học do Gemini 2.5 Flash soạn và tự động lưu vào Firebase Firestore.

2. **Tải file trực tiếp từ máy (`POST /api/video/upload`):**
   * Cho phép chọn file `.mp3`, `.wav`, `.mp4` từ máy tính để bóc tách phụ đề và tóm tắt.

3. **Xuất file phụ đề chuẩn (`GET /api/video/export`):**
   * Nhập URL video và chọn format (`srt` hoặc `vtt`) để tải file phụ đề về máy dùng cho VLC hoặc CapCut.

4. **Xem lịch sử bài giảng đã lưu (`GET /api/history`):**
   * Bấm **Execute** để xem danh sách các bài giảng đã lưu trữ an toàn trong Firebase Firestore.

---

### Cách 2: Chạy kiểm thử tự động toàn diện (Automated Test Suite)
Để kiểm tra nhanh trạng thái của toàn bộ các module mà không cần mở trình duyệt:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"
.\.venv\Scripts\python test_api.py
```
*Script sẽ kiểm tra tự động:*
* Xuất file `.srt` và `.vtt` chuẩn quốc tế.
* Dịch thuật đồng bộ giữ nguyên mốc giây.
* Mô hình Gemini 2.5 Flash tóm tắt 4 phần và xuất câu hỏi trắc nghiệm.

---

### Cách 3: Chạy bóc tách phụ đề độc lập bằng dòng lệnh (PoC CLI)
Nếu muốn test nhanh 1 video bất kỳ trên cửa sổ dòng lệnh:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"

# Chạy thử 30 giây đầu của video:
.\.venv\Scripts\python poc_test.py "LINK_YOUTUBE" 30

# Hoặc không điền số giây để xử lý toàn bộ video:
.\.venv\Scripts\python poc_test.py "LINK_YOUTUBE"
```

---

## 📌 PHẦN 3: CÁCH TẮT MÁY CHỦ & XỬ LÝ SỰ CỐ

1. **Cách tắt máy chủ:**
   * Trong cửa sổ Terminal đang chạy `run_server.py`, bấm tổ hợp phím **`Ctrl + C`**.
2. **Cách xử lý khi cổng 8000 bị kẹt:**
   * Nếu gặp lỗi cổng 8000 bị chiếm dụng, chạy lệnh sau trong PowerShell để giải phóng:
     ```powershell
     Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
     ```
3. **Bảo mật file khóa:**
   * File `backend-ai/serviceAccountKey.json` và `backend-ai/.env` đã được cấu hình trong `.gitignore` để không bao giờ bị đẩy lên GitHub, đảm bảo an toàn tuyệt đối.
