# HƯỚNG DẪN CHẠY & TỔNG KẾT GIAI ĐOẠN 02 (TUẦN 3 - 5)
### Đề tài: Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng
* **Học phần:** Phát triển Ứng dụng | Đại học Lạc Hồng  
* **Thành viên thực hiện:** Võ Trần Minh Thắng (Nhóm trưởng) & Vũ Đình Khánh Long  
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường  
* **Trạng thái:** ✅ **Đã hoàn thành 100% Backend AI Core**

---

## 📌 MỤC LỤC
1. [Cấu hình môi trường Cloud (.env)](#1-cấu-hình-môi-trường-cloud-env)
2. [Cách 1: Khởi động Server & Dùng thử trên Swagger UI (Khuyên dùng)](#2-cách-1-khởi-động-server--dùng-thử-trên-swagger-ui-khuyên-dùng)
3. [Cách 2: Chạy kiểm thử tự động toàn diện (Test Suite)](#3-cách-2-chạy-kiểm-thử-tự-động-toàn-diện-test-suite)
4. [Cách 3: Kiểm tra kết nối CSDL MongoDB Atlas](#4-cách-3-kiểm-tra-kết-nối-csdl-mongodb-atlas)
5. [Danh mục các Endpoint API Tuần 3-5](#5-danh-mục-các-endpoint-api-tuần-3-5)
6. [Cách tắt server an toàn & Xử lý lỗi thường gặp](#6-cách-tắt-server-an-toàn--xử-lý-lỗi-thường-gặp)

---

## 1. CẤU HÌNH MÔI TRƯỜNG CLOUD (.env)

Tất cả cấu hình kết nối đám mây đã được thiết lập sẵn trong file `backend-ai/.env`:
* **MongoDB Atlas Cloud:** `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0`
* **Gemini 2.5 Flash:** `GEMINI_API_KEY=your_gemini_api_key_here`
* **Whisper AI Device:** `WHISPER_DEVICE=cpu`, `compute_type=int8` (Chạy siêu mượt và ổn định).

---

## 2. CÁCH 1: KHỞI ĐỘNG SERVER & DÙNG THỬ TRÊN SWAGGER UI (KHUYÊN DÙNG)

### Bước 1: Khởi động máy chủ Backend AI
Mở Terminal PowerShell tại thư mục `backend-ai`:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"
.\.venv\Scripts\python run_server.py
```
*Khi thấy thông báo:*
```
INFO: Kết nối MongoDB thành công!
INFO: Application startup complete.
INFO: Uvicorn running on http://127.0.0.1:8000
```
*nghĩa là máy chủ và CSDL Đám mây đã sẵn sàng.*

### Bước 2: Mở giao diện Swagger UI
Mở trình duyệt truy cập: 👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### Bước 3: Thử nghiệm các tính năng chính
1. **Xử lý video bài giảng (`POST /api/video/process`):**
   * Bấm **Try it out**, dán mẫu JSON:
     ```json
     {
       "video_url": "https://youtu.be/dxvTSf-k23k?si=vowa_TPbX968ARJx",
       "max_duration_seconds": 20,
       "source_language": "auto",
       "target_language": "vi"
     }
     ```
   * Bấm **Execute** $\rightarrow$ Kết quả trả về gồm:
     * Phụ đề mốc giây chuẩn xác từng câu (`start`, `end`, `text`).
     * Tóm tắt bài giảng chuyên sâu do **Gemini 2.5 Flash** phân tích.
     * Điểm cốt lõi (`key_points`), Thuật ngữ/Công thức và Bộ trắc nghiệm (`quiz`).
     * Dữ liệu tự động lưu vào MongoDB Atlas Cloud.

2. **Tải file trực tiếp từ máy tính (`POST /api/video/upload`):**
   * Cho phép chọn file ghi âm hoặc video (`.mp3`, `.wav`, `.mp4`, `.m4a`) từ máy tính để AI tự bóc tách và tóm tắt.

3. **Xuất file phụ đề chuẩn (`GET /api/video/export`):**
   * Nhập URL video và chọn format (`srt` hoặc `vtt`) để tải file phụ đề về máy kéo thả vào VLC hoặc CapCut.

---

## 3. CÁCH 2: CHẠY KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (TEST SUITE)

Chạy 1 dòng lệnh để kiểm thử tự động toàn bộ module lõi:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"
.\.venv\Scripts\python test_api.py
```
*Hệ thống sẽ tự động kiểm tra:*
* ✅ Format xuất file `.srt` và `.vtt` chuẩn quốc tế.
* ✅ Module dịch thuật đa ngôn ngữ bảo toàn 100% mốc thời gian.
* ✅ Mô hình Gemini 2.5 Flash tóm tắt 4 phần và xuất câu hỏi trắc nghiệm.

---

## 4. CÁCH 3: KIỂM TRA KẾT NỐI CSDL MONGODB ATLAS

Để kiểm tra trạng thái cụm CSDL đám mây hoặc tạo lại các bảng Indexes:
```powershell
cd "c:\Users\thang\Desktop\Phát triển ứng dụng\backend-ai"
.\.venv\Scripts\python -m app.init_db
```
*Kết quả:* Thông báo `✅ Kết nối MongoDB thành công!` và tạo đủ 4 Collections (`lectures`, `subtitles`, `summaries`, `users`).

---

## 5. DANH MỤC CÁC ENDPOINT API TUẦN 3-5

| Method | Endpoint | Mô tả chức năng |
| :---: | :--- | :--- |
| **GET** | `/` | Kiểm tra tình trạng server (Health check) |
| **POST** | `/api/video/process` | Xử lý link video (YouTube/Drive) $\rightarrow$ Whisper $\rightarrow$ LLM $\rightarrow$ Cache Cloud |
| **POST** | `/api/video/upload` | Tải file ghi âm/video từ máy lên để tạo phụ đề & tóm tắt |
| **GET** | `/api/video/export` | Tải file phụ đề chuẩn `.srt` hoặc `.vtt` về máy |
| **GET** | `/api/history` | Xem danh sách bài giảng đã xử lý lưu trong MongoDB Cloud |
| **WS** | `/api/live/stream` | Kênh WebSocket thu âm Micro trực tiếp theo thời gian thực (Live-Caption) |

---

## 6. CÁCH TẮT SERVER AN TOÀN & XỬ LÝ LỖI THƯỜNG GẶP

* **Cách tắt server:** Trong cửa sổ Terminal đang chạy `run_server.py`, bấm tổ hợp phím **`Ctrl + C`**.
* **Xử lý khi cổng 8000 bị chiếm dụng:**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
  ```
