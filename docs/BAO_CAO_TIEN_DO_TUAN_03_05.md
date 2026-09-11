# BÁO CÁO TIẾN ĐỘ THỰC HIỆN ĐỀ TÀI (TUẦN 3 - 5)
### Đề tài: Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng
* **Học phần:** Phát triển Ứng dụng
* **Khoa:** Công nghệ Thông tin - Trường Đại học Lạc Hồng (LHU)
* **Thời gian thực hiện:** 07/09/2026 – 27/09/2026 (Giai đoạn 02: Xây dựng Backend AI Core)
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường
* **Nhóm sinh viên thực hiện:**
  1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)
  2. **Vũ Đình Khánh Long** (MSSV: `123001217` - Thành viên)

---

## I. MỤC TIÊU CỦA GIAI ĐOẠN 02 (TUẦN 3 - 5)

Theo đúng đề cương nghiên cứu và cam kết trong Phiếu Đăng ký Thuyết minh, Giai đoạn 02 tập trung vào việc **xây dựng "Trái tim" AI của toàn bộ hệ thống** — Máy chủ Backend AI Core độc lập, đảm nhiệm:
1. **Module Audio Ingestion Đa Nguồn:** Bóc tách âm thanh siêu nhẹ từ YouTube, Google Drive, LMS và tiếp nhận trực tiếp file upload (`.mp3`, `.wav`, `.mp4`).
2. **Lõi AI Phiên Âm Speech-to-Text (Faster-Whisper):** Nhận diện lời nói, lọc khoảng lặng VAD và tạo mốc thời gian (Timestamps) chuẩn từng giây.
3. **Module Dịch Thuật Đa Ngôn Ngữ:** Dịch phụ đề đồng bộ sang Tiếng Việt (`vi`) hoặc Tiếng Anh (`en`), bảo toàn 100% mốc thời gian câu gốc.
4. **Module Tóm Tắt & Sinh Trắc Nghiệm Bằng LLM (Gemini 2.5 Flash):** Tự động phân tích nội dung, sinh 4 thành phần: Tổng quan, Điểm cốt lõi, Thuật ngữ & Công thức, Bộ trắc nghiệm tự ôn tập.
5. **Module Xuất File Phụ Đề Chuẩn Quốc Tế:** Xuất file `.srt` (VLC, CapCut) và `.vtt` (Web Player, Extension).
6. **Tích Hợp Cơ Sở Dữ Liệu Đám Mây MongoDB Atlas:** Lưu trữ vĩnh viễn dữ liệu và kích hoạt cơ chế Cache $O(1)$ tra cứu dưới 0.01 giây.
7. **Kênh WebSocket Live-Caption Realtime:** Thiết lập cổng `ws://127.0.0.1:8000/api/live/stream` nhận âm thanh Micro và trả chữ trực tiếp.

---

## II. PHÂN CÔNG NHIỆM VỤ GIỮA 2 THÀNH VIÊN TRONG NHÓM

| Thành viên | Nhiệm vụ đảm nhiệm trong Giai đoạn 02 | Mức độ hoàn thành | Minh chứng sản phẩm |
| :--- | :--- | :---: | :--- |
| **Võ Trần Minh Thắng**<br>*(Nhóm trưởng)* | • Thiết lập và kết nối CSDL MongoDB Atlas Cloud (`cluster0`).<br>• Xây dựng cơ chế tra cứu Cache thông minh $O(1)$.<br>• Tối ưu lõi `faster-whisper` (nhận diện thiết bị, CPU int8, VAD filter).<br>• Xây dựng module xuất file phụ đề chuẩn quốc tế [subtitle_exporter.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/app/services/subtitle_exporter.py).<br>• Thiết lập kênh WebSocket Live-caption [websocket_router.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/app/api/websocket_router.py).<br>• Viết kịch bản kiểm thử tích hợp tự động [test_api.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/test_api.py). | **100%** | • Cụm MongoDB Atlas hoạt động.<br>• File `.srt` & `.vtt` xuất chuẩn.<br>• WebSocket Live-caption chạy thật.<br>• Toàn bộ Test Suite pass 100%. |
| **Vũ Đình Khánh Long**<br>*(Thành viên)* | • Xây dựng module trích xuất âm thanh đa nguồn [audio_service.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/app/services/audio_service.py) (YouTube + File upload).<br>• Tích hợp module Dịch thuật đa ngôn ngữ [translation_service.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/app/services/translation_service.py).<br>• Thiết kế Prompt chuyên sâu cho LLM Gemini 2.5 Flash trong [summary_service.py](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend-ai/app/services/summary_service.py).<br>• Hoàn thiện giao diện tài liệu tương tác Swagger API UI tại `/docs`.<br>• Thu thập tập dữ liệu video bài giảng thực tế để chạy thử nghiệm nghiệm thu. | **100%** | • Upload file trực tiếp bằng FFmpeg.<br>• Gemini 2.5 Flash tóm tắt & quiz.<br>• Swagger UI v2.0 đầy đủ endpoint.<br>• Kết quả test bài giảng thực tế. |

---

## III. KẾT QUẢ THỰC NGHIỆM CHI TIẾT

### 1. Kết nối CSDL MongoDB Atlas trên Cloud
* Đã kết nối thành công tới cụm Cloud: `mongodb+srv://admin:***@cluster0.r3rtscj.mongodb.net/?appName=Cluster0`
* Tự động khởi tạo database `lecture_caption_db` với 4 collections:
  * `lectures`: Đánh Unique Index trên trường `video_url`.
  * `subtitles`: Đánh Index trên trường `lecture_id`.
  * `summaries`: Đánh Index trên trường `lecture_id`.
  * `users`: Đánh Unique Index trên trường `email`.
* **Hiệu năng Caching:** Tra cứu video đã từng xử lý trả về kết quả trong **< 0.01 giây** mà không tốn tài nguyên chạy lại AI.

### 2. Mô hình Whisper AI & Dịch thuật đa ngôn ngữ
* Tự động phát hiện chính xác ngôn ngữ video (`vi`, `en`, `ja`...).
* Tích hợp bộ lọc khoảng lặng VAD (`min_silence_duration_ms=500`), loại bỏ triệt để các đoạn giảng viên ngừng nói.
* Thuật toán dịch thuật bảo toàn 100% mốc thời gian `start` $\rightarrow$ `end` của câu gốc, không làm lệch phụ đề khi xem video.

### 3. Phân tích ngữ cảnh & Tóm tắt bằng Gemini 2.5 Flash
Mô hình LLM được tích hợp thành công, tự động trích xuất cấu trúc 4 phần chuẩn mực:
```json
{
  "summary": "Đoạn phụ đề đóng vai trò là lời kêu gọi hành động trực tiếp...",
  "key_points": [
    "Kêu gọi hành động chính: Khuyến khích người xem đăng ký kênh.",
    "Tín hiệu chuyển tiếp: 'Okay, let's go!' báo hiệu bắt đầu nội dung chính."
  ],
  "formulas_and_terms": [
    "Speech-to-Text: Nhận diện giọng nói thành văn bản",
    "Timestamps: Mốc đồng bộ thời gian"
  ],
  "quiz": [
    {
      "question": "Nội dung chính được nghiên cứu trong bài học hôm nay là gì?",
      "options": ["A. Mạng nơ-ron CNN", "B. ResNet", "C. YOLO", "D. BERT"],
      "answer": "A. Mạng nơ-ron CNN",
      "explanation": "Kiến trúc mạng thần kinh tích chập dùng trong thị giác máy tính."
    }
  ]
}
```

### 4. Xuất file phụ đề chuẩn quốc tế (.srt & .vtt)
Đã chạy kiểm thử tự động xuất cả 2 định dạng chuẩn:
* **Định dạng .srt:** Khớp mốc `00:00:00,500 --> 00:00:03,200` có thể tải về kéo thả trực tiếp vào VLC Media Player hoặc phần mềm làm video CapCut.
* **Định dạng .vtt:** Chuẩn WebVTT cho trình duyệt web và thẻ `<track>` HTML5.

---

## IV. HƯỚNG DẪN DÀNH CHO GIẢNG VIÊN ĐỂ NGHIỆM THU DỰ ÁN

Giảng viên có thể nghiệm thu trực tiếp hệ thống theo 2 cách đơn giản sau:

### Cách 1: Nghiệm thu qua Giao diện Web trực quan (Swagger UI)
1. Mở PowerShell tại thư mục `backend-ai`:
   ```powershell
   .\.venv\Scripts\python run_server.py
   ```
2. Mở trình duyệt truy cập: **`http://127.0.0.1:8000/docs`**
3. Thử nghiệm Endpoint `POST /api/video/process`:
   * Nhập link video bài giảng bất kỳ (YouTube hoặc Drive).
   * Điền số giây muốn test nhanh (ví dụ: `20` hoặc `30` giây).
   * Bấm **Execute** $\rightarrow$ Hệ thống sẽ trả về đầy đủ phụ đề mốc giây, bản dịch và tóm tắt do Gemini 2.5 Flash sinh ra.

### Cách 2: Nghiệm thu qua Script kiểm thử tự động toàn diện
Chạy 1 dòng lệnh duy nhất để kiểm tra toàn bộ các module lõi:
```powershell
.\.venv\Scripts\python test_api.py
```

---

## V. KẾ HOẠCH BƯỚC TIẾP THEO: GIAI ĐOẠN 03 (TUẦN 6 - 8)

Tiến hành phát triển **Mobile Application (Flutter / React Native)**:
* Thiết lập dự án Mobile App đa nền tảng (Android & iOS).
* Xây dựng giao diện dựa trên bản vẽ Wireframe đã được duyệt ở Tuần 1-2.
* Tích hợp gọi RESTful API tới Backend AI Core để hiển thị danh sách bài giảng, phụ đề chạy theo video và tab tóm tắt thông minh.
* Kết nối WebSocket để hiển thị phụ đề Live-Caption khi học trực tiếp trên lớp.
