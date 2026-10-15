# BÁO CÁO TỔNG KẾT TIẾN ĐỘ CÔNG VIỆC TRONG TUẦN
**Đề tài:** Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng  
**Thời gian:** Tuần từ 05/10/2026 đến 09/10/2026  
**Thực hiện:** Nhóm phát triển (Võ Trần Minh Thắng & Trịnh Khánh Long)  
**Đơn vị:** Khoa Công nghệ Thông tin - Trường Đại học Lạc Hồng (LHU)  

---

## 📌 TỔNG QUAN NỘI DUNG THỰC HIỆN TRONG TUẦN

Trong tuần này, nhóm đã tập trung hoàn thiện toàn diện cả **3 thành phần chính của hệ thống**:
1. **Ứng dụng di động (Mobile App - React Native / Expo)**
2. **Máy chủ trí tuệ nhân tạo (Backend AI - FastAPI / Faster-Whisper / Gemini)**
3. **Tiện ích trình duyệt (Browser Extension - Chrome Manifest V3)**

Dưới đây là chi tiết toàn bộ các hạng mục công việc, tính năng, tối ưu hóa giao diện và sửa lỗi đã thực hiện:

---

## 1. 📱 NÂNG CẤP & HOÀN THIỆN MOBILE APP (REACT NATIVE / EXPO)

### 1.1. Tự động hóa phân loại bài giảng bằng AI (Auto-Classification)
- **Bỏ nhập liệu thủ công:** Đã loại bỏ hoàn toàn các ô nhập tên thư mục và nhập thẻ nhãn bằng tay trên màn hình chính (`HomeScreen.js`) và thẻ bài giảng (`LectureCard.js`).
- **AI tự động gắn thư mục & thẻ nhãn:** Sau khi phân tích nội dung, AI Gemini tự động phân loại bài giảng vào thư mục tương ứng (ví dụ: *Lập trình*, *Khoa học*, *Ngoại ngữ*...) và sinh ra danh sách từ khóa/thẻ tag chủ đề (ví dụ: `#JavaScript`, `#React`, `#AI`...).

### 1.2. Bộ lọc thẻ bài giảng đa chọn (`🏷️ Bộ lọc thẻ`)
- Thiết kế nút bấm **`🏷️ Bộ lọc thẻ`** kích thước lớn, nổi bật ngay dưới thanh tìm kiếm.
- Xây dựng **Modal Bộ lọc thẻ (TagFilterModal)** cho phép người dùng chọn cùng lúc một hoặc nhiều thẻ nhãn để lọc bài giảng.
- Hiển thị dải chip các thẻ đang được chọn lọc (kèm nút `✕` xóa từng thẻ).
- Nút **`✕ Hủy lọc`** giúp người dùng đặt lại danh sách ban đầu tức thì chỉ với 1 chạm.

### 1.3. Cải tiến luồng cấu hình dịch URL (`UrlConfigModal`)
- Chuyển đổi trải nghiệm người dùng: Khi dán đường link video và bấm **"Bắt đầu tạo phụ đề"**, ứng dụng sẽ mở popup hộp thoại cấu hình chi tiết thay vì để các nút gạt rải rác:
  - Cho phép chọn chế độ: **Dịch toàn bộ video** hoặc **Dịch một đoạn thời gian**.
  - Nếu chọn dịch một đoạn: Cung cấp bộ chọn thời gian bắt đầu (`mm:ss`) và kết thúc (`mm:ss`), tự động giới hạn không cho nhập vượt quá thời lượng thực tế của video.
  - Cho phép bật/tắt tùy chọn biên soạn câu hỏi trắc nghiệm ôn tập (Quiz).

### 1.4. Cơ chế ngắt ngang tiến trình đang chạy (Task Cancellation)
- Bổ sung nút **`🛑 HỦY TIẾN TRÌNH ĐANG CHẠY`** trên thanh tiến trình xử lý.
- Khi người dùng bấm hủy:
  - Hủy ngay request HTTP trên ứng dụng qua `AbortController`.
  - Gửi tín hiệu `POST /api/video/cancel/{job_id}` lên Backend AI để dừng ngay tiến trình tải video và mô hình Whisper, giải phóng lập tức tài nguyên CPU/GPU và bộ nhớ RAM.

### 1.5. Thiết lập thư mục tải về mặc định (Default Download Directory)
- Tích hợp mục **`📁 THƯ MỤC TẢI VỀ MẶC ĐỊNH`** trong menu Cài đặt hệ thống (`SettingsModal.js`).
- Cho phép người dùng chọn sẵn 1 thư mục cố định trên điện thoại (ví dụ: thư mục `Download` hoặc `Documents`).
- Áp dụng cơ chế **1-Click Tải xuống**: Khi đã cài đặt, các file phụ đề (`.srt`, `.vtt`), tài liệu ôn tập (`.txt`) và video ghép phụ đề (`.mp4`) sẽ được lưu tự động vào đúng vị trí đó mà không làm phiền người dùng với các bảng hỏi mỗi lần tải.
- Cung cấp nút **Đổi thư mục** và **Hủy mặc định** linh hoạt.
- **Sửa lỗi tương thích hệ thống:** Khắc phục triệt để lỗi `StorageAccessFramework of undefined` trên Expo SDK mới bằng cách tích hợp module `expo-file-system/legacy` và cơ chế fallback `Directory Picker`.

### 1.6. Bộ 3 nút xuất bản & chia sẻ tại màn hình ôn tập (`SummaryQuizScreen.js`)
- **`📥 TÀI LIỆU`:** Tổng hợp toàn bộ tóm tắt, điểm kiến thức cốt lõi, công thức thuật ngữ, câu hỏi trắc nghiệm và bài tập thành một file văn bản `.txt` hoàn chỉnh để lưu trữ hoặc in ấn.
- **`🎬 TẢI VIDEO`:** Gọi API Backend thực hiện ghép cứng phụ đề vào khung hình video bằng FFmpeg (Hardsub) và tải file `.mp4` về máy để xem offline.
- **`📤 CHIA SẺ`:** Mở khay chia sẻ nhanh của hệ thống Android/iOS để gửi nội dung cốt lõi qua Zalo, Messenger, SMS...

### 1.7. Trình phát đồng bộ & Tương tác thông minh (`SyncPlayerScreen.js`)
- Tích hợp song song cả YouTube Iframe Player và HTML5 Video/Audio native.
- **Lớp phủ phụ đề nổi (Overlay CC):** Hiển thị chữ nổi trực tiếp trên video phong cách Netflix/YouTube kèm nút bật/tắt `[CC]`.
- **Đa dạng chế độ phụ đề:** Cho phép chuyển đổi linh hoạt giữa 3 chế độ: *Song ngữ (Bilingual)*, *Chỉ phụ đề dịch (Target)*, *Chỉ ngôn ngữ gốc (Original)*.
- **Trắc nghiệm tương tác theo dòng thời gian (In-Video Checkpoint Quiz):** Video tự động tạm dừng khi chạm đến các mốc kiến thức trọng tâm để học sinh làm bài tập kiểm tra trắc nghiệm ngay trong lúc xem bài giảng.
- **Tìm kiếm nội dung bài giảng theo thời gian thực:** Thanh tìm kiếm `🔍 Tìm câu / thuật ngữ...` giúp lọc nhanh các câu nói trong video; người dùng bấm vào câu nào là video tự động tua đến đúng giây đó.
- **Phát âm tóm tắt bằng giọng nói AI (Text-to-Speech):** Hỗ trợ đọc tóm tắt bằng giọng bản ngữ tiếng Việt chuẩn có dấu và đa ngôn ngữ.

### 1.8. Đồng bộ cơ sở dữ liệu đám mây Google Firebase Firestore
- Tự động lưu trữ bài giảng và cơ chế Cache $O(1)$ tức thì giúp mở lại bài giảng cũ mà không tốn công dịch lại.
- **Đồng bộ hóa thao tác xóa:** Khi người dùng bấm Xóa bài giảng trên điện thoại, hệ thống đồng thời xóa sạch bản ghi trên Cloud Firestore và bộ nhớ tạm của máy.

---

## 2. 🧠 NÂNG CẤP & TỐI ƯU MÁY CHỦ AI BACKEND (`backend-ai`)

### 2.1. Cải tiến Service Tóm tắt & Phân loại (`summary_service.py`)
- Cập nhật System Prompt cho Gemini AI để tự động trích xuất:
  - Thư mục môn học phù hợp nhất (`folder`).
  - Danh sách 3-5 thẻ hashtag phân loại nội dung (`tags`).
  - Điểm kiến thức cốt lõi, từ vựng chuyên ngành, bộ câu hỏi trắc nghiệm có giải thích chi tiết và bài tập tự luyện.

### 2.2. Kiểm tra bản quyền số & bảo vệ DRM (`audio_service.py`)
- Tích hợp hàm xác minh bản quyền trước khi tải video: Kiểm tra các cờ DRM (Digital Rights Management), video trả phí, video riêng tư hoặc bị giới hạn bản quyền tải xuống để từ chối xử lý và hiển thị thông báo lỗi minh bạch.

### 2.3. Dịch vụ ghép cứng phụ đề vào Video (Hardsub MP4 Service)
- Xây dựng endpoint `POST /api/video/burn-subtitles` sử dụng thư viện **FFmpeg**:
  - Tự động sinh file phụ đề `.ass` / `.srt` tạm thời với định dạng phông chữ, màu sắc và viền chữ rõ nét.
  - Sử dụng bộ lọc video `subtitles filter` của FFmpeg để render phụ đề trực tiếp lên từng khung hình của video gốc.
  - Xuất ra file `.mp4` hoàn chỉnh cho phép tải về điện thoại xem offline.

### 2.4. Cơ chế ngắt ngang tác vụ (Job Cancellation Endpoint)
- Xây dựng endpoint `POST /api/video/cancel/{job_id}`:
  - Quản lý danh sách các tác vụ đang chạy (`cancelled_jobs`).
  - Cho phép hủy giữa chừng các công đoạn tốn thời gian như bóc tách âm thanh, nhận diện Whisper hoặc gọi Gemini AI để giải phóng tài nguyên GPU RTX 2050 và RAM máy chủ.

### 2.5. Tích hợp Cloudflare Tunnel (`cloudflared.exe`)
- Bổ sung binary `cloudflared.exe` vào thư mục dự án backend.
- Tạo đường hầm HTTPS an toàn ra Internet kết nối từ xa (`trycloudflare.com`) để điện thoại thật và máy ảo Android dễ dàng kết nối tới server AI trên máy tính cá nhân.

---

## 3. 🌐 CẬP NHẬN TIỆN ÍCH TRÌNH DUYỆT (`browser-extension`)

- Nâng cấp toàn diện giao diện `popup.html` và `popup.css` theo phong cách Dark Mode hiện đại, đồng bộ màu sắc thương hiệu với Mobile App.
- Cập nhật logic `popup.js`:
  - Tự động nhận diện tab YouTube đang mở.
  - Trích xuất tiêu đề, thời lượng và URL video hiện tại.
  - Cho phép người dùng 1-click gửi liên kết bài giảng sang hệ thống dịch thuật AI.

---

## 📊 BẢNG TỔNG KẾT TIẾN ĐỘ TÍNH NĂNG ĐẾN THỜI ĐIỂM HIỆN TẠI

| STT | Hạng mục / Tính năng | Thành phần | Trạng thái |
| :---: | :--- | :---: | :---: |
| 1 | AI Tự động phân loại thư mục & gán thẻ nhãn | Backend & Mobile | ✅ Hoàn thành |
| 2 | Bộ lọc thẻ đa chọn (`🏷️ Bộ lọc thẻ`) | Mobile App | ✅ Hoàn thành |
| 3 | Popup cấu hình dịch URL (Toàn bộ / Đoạn thời gian) | Mobile App | ✅ Hoàn thành |
| 4 | Cơ chế ngắt ngang tiến trình đang chạy (Cancel Task) | Backend & Mobile | ✅ Hoàn thành |
| 5 | Tìm kiếm nội dung bên trong bài giảng (In-Video Search) | Mobile App | ✅ Hoàn thành |
| 6 | Trắc nghiệm tương tác theo dòng thời gian (In-Video Quiz) | Mobile App | ✅ Hoàn thành |
| 7 | Xác minh bản quyền video & DRM trước khi tải | Backend AI | ✅ Hoàn thành |
| 8 | Thiết lập thư mục tải về mặc định (SAF / Expo Legacy) | Mobile App | ✅ Hoàn thành |
| 9 | Xuất tài liệu tóm tắt & trắc nghiệm (.TXT) | Mobile App | ✅ Hoàn thành |
| 10 | Render & Tải video ghép cứng phụ đề (Hardsub MP4) | Backend & Mobile | ✅ Hoàn thành |
| 11 | Đồng bộ dữ liệu & thao tác xóa bài giảng trên Firebase | Backend & Mobile | ✅ Hoàn thành |
| 12 | Giao diện hiện đại Chrome Extension (Dark Mode) | Extension | ✅ Hoàn thành |

---

## 🎯 KẾ HOẠCH BƯỚC TIẾP THEO
1. Xây dựng file khởi động tự động 1-click (`start_all.bat`) chạy kèm tính năng tự đồng bộ URL Cloudflare vào Firebase.
2. Lập bảng phân tích và đánh giá chi phí Token (Local Whisper GPU vs Cloud API) để phục vụ viết cuốn báo cáo đồ án.
3. Hoàn thiện đóng gói file cài đặt `.apk` cho thiết bị Android thực tế.
