# TỔNG QUAN BÀI TOÁN & PHÂN TÍCH CÁC GIẢI PHÁP TƯƠNG TỰ TRÊN THỊ TRƯỜNG

> **Đề tài:** Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng  
> **Học phần:** Phát triển Ứng dụng - Đại học Lạc Hồng  
> **Sinh viên thực hiện:** Võ Trần Minh Thắng & Vũ Đình Khánh Long  

---

## 1. TỔNG QUAN BÀI TOÁN & BỐI CẢNH THỰC TẾ

### 1.1. Bối cảnh
Trong xu thế chuyển đổi số giáo dục và tự học trực tuyến hiện nay:
* Hầu hết sinh viên, học viên đều thường xuyên tiếp cận các nguồn bài giảng mở quốc tế (YouTube, Coursera, Udemy, MIT OpenCourseWare, edX...) cũng như các hệ thống học tập nội bộ của nhà trường (LMS Moodle, Google Drive, Microsoft Teams...).
* Các bài giảng chuyên sâu về công nghệ, khoa học kỹ thuật đa phần được giảng dạy bằng tiếng Anh hoặc ngoại ngữ khác với tốc độ nói nhanh và nhiều thuật ngữ chuyên môn.

### 1.2. Các vấn đề và thách thức của người học (Pain Points)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    5 THÁCH THỨC LỚN CỦA NGƯỜI HỌC                          │
├────────────────────────────────────────────────────────────────────────────┤
│ 1. Rào cản ngôn ngữ: Giảng viên nước ngoài phát âm nhanh, dùng thuật ngữ  │
│    học thuật khó nắm bắt nếu chỉ nghe thông thường.                        │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. Video không có phụ đề: Hầu hết video trên LMS trường, Google Drive,    │
│    video quay lại lớp học đều KHÔNG có phụ đề sẵn.                         │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. Mất nhiều thời gian ghi chép: Một bài giảng dài 60-90 phút thường ngốn  │
│    của sinh viên 2-3 tiếng để vừa nghe vừa tạm dừng để chép bài.           │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. Thiết bị hạn chế dung lượng: Tải cả file video bài giảng (1GB - 3GB) về │
│    điện thoại gây tràn bộ nhớ, tốn thời gian và hao tổn băng thông 4G/WiFi.│
├────────────────────────────────────────────────────────────────────────────┤
│ 5. Khó khăn tại giảng đường trực tiếp: Phòng học đông, âm thanh vang dội   │
│    hoặc đối với các bạn sinh viên khiếm thính/nghe kém rất khó bắt kịp bài.│
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. KHẢO SÁT & PHÂN TÍCH CÁC CÔNG CỤ TƯƠNG TỰ TRÊN THỊ TRƯỜNG

Hiện nay trên thị trường đã có một số công cụ hỗ trợ xử lý giọng nói, phụ đề hoặc tóm tắt video. Tuy nhiên, mỗi giải pháp đều tồn tại những hạn chế rõ rệt khi áp dụng vào việc học tập của sinh viên:

### 2.1. Otter.ai
* **Mô hình:** Ứng dụng Cloud thương mại chuyên ghi âm cuộc họp/bài giảng bằng tiếng Anh.
* **Ưu điểm:** Độ chính xác tiếng Anh rất cao; nhận diện người nói tốt; có khả năng tóm tắt ý chính.
* **Nhược điểm lớn:**
  * **Chi phí rất đắt:** Mô hình thuê bao hàng tháng (từ $10 - $30/tháng), không phù hợp với túi tiền sinh viên.
  * **Hỗ trợ tiếng Việt rất kém:** Không tối ưu cho các bài giảng tiếng Việt tại trường đại học.
  * Đóng kín mã nguồn, không hỗ trợ bóc tách link tùy biến từ LMS hay tab trình duyệt tự do.

### 2.2. Phụ đề tự động của YouTube (YouTube Auto-Captions)
* **Mô hình:** Tích hợp trực tiếp trên nền tảng YouTube của Google.
* **Ưu điểm:** Miễn phí, sẵn có, tốc độ đồng bộ thời gian tương đối tốt.
* **Nhược điểm lớn:**
  * **Chỉ hoạt động độc quyền trên YouTube:** Hoàn toàn bất lực với video lưu trên Google Drive, LMS trường, Coursera hoặc bài giảng trực tiếp.
  * **Không có tính năng tóm tắt bài giảng:** Người học vẫn phải tự ngồi lọc thông tin.
  * Khả năng dịch tự động sang tiếng Việt hay bị lỗi ngữ pháp và sai lệch các thuật ngữ kỹ thuật.

### 2.3. Các tiện ích tóm tắt video (NoteGPT, Eightify, Harpa AI)
* **Mô hình:** Chrome Extension sử dụng OpenAI ChatGPT API để tóm tắt video YouTube.
* **Ưu điểm:** Giao diện trực quan, tóm tắt nhanh thành danh sách gạch đầu dòng và phân đoạn mốc thời gian.
* **Nhược điểm lớn:**
  * **Phụ thuộc 100% vào transcript có sẵn:** Các tiện ích này chỉ "cào" lại phụ đề chữ có sẵn của YouTube. **Nếu video không có phụ đề sẵn (như bài giảng của thầy cô tải lên) thì công cụ hoàn toàn không hoạt động.**
  * Bản miễn phí giới hạn rất gắt gao (chỉ cho tóm tắt 3 - 5 video ngắn mỗi ngày).

### 2.4. Phần mềm biên tập phụ đề truyền thống (CapCut, Subtitle Edit, Aegisub)
* **Mô hình:** Phần mềm cài đặt trên máy tính (Offline desktop software).
* **Ưu điểm:** Tùy biến phụ đề chi tiết, độ chính xác cao khi có can thiệp thủ công.
* **Nhược điểm lớn:**
  * **Quy trình cồng kềnh:** Người dùng bắt buộc phải tải toàn bộ file video nặng hàng Gigabyte về máy tính.
  * Không phục vụ nhu cầu học tập tức thời; không có tính năng tóm tắt ý chính và không có ứng dụng di động gọn nhẹ để học mọi lúc mọi nơi.

### 2.5. Live Caption tích hợp trên hệ điều hành (Google Live Caption trên Android/Chrome)
* **Mô hình:** Bắt luồng âm thanh hệ thống để hiển thị phụ đề trực tiếp.
* **Ưu điểm:** Chạy offline trên một số dòng máy cao cấp, bắt âm thanh nhạy.
* **Nhược điểm lớn:**
  * Phụ đề chỉ là một dòng chữ tạm thời chạy lướt qua màn hình rồi biến mất.
  * **Không lưu lại nội dung**, không thể xem lại mốc thời gian, không trích xuất được tài liệu ôn tập và không có tóm tắt.

---

## 3. BẢNG ĐỐI SÁNH TÍNH NĂNG (BENCHMARK MATRIX)

| Tiêu chí so sánh | Otter.ai | YouTube Captions | NoteGPT / Eightify | CapCut / Offline | **Giải pháp của Đề tài** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Chi phí sử dụng** | Rất đắt ($10-$30/th) | Miễn phí | Giới hạn (Có phí) | Miễn phí/Có phí | **Hoàn toàn 0 đồng (Open-source)** |
| **Không cần tải video nặng** | ❌ (Cần upload file) | ✅ (Chỉ YouTube) | ✅ (Chỉ YouTube) | ❌ (Phải tải cả video) | **✅ Hỗ trợ dán URL (YouTube, Drive, LMS)** |
| **Xử lý video KHÔNG có phụ đề**| ✅ | ❌ | ❌ (Bó tay nếu ko có subtitle) | ✅ | **✅ Tự nhận diện bằng Whisper AI** |
| **Tự động tóm tắt bài giảng** | ✅ | ❌ | ✅ | ❌ | **✅ Dàn ý, khái niệm, công thức** |
| **Dịch thuật đa ngôn ngữ** | Hạn chế | Khá | Có | Thủ công | **✅ Tự động dịch sang tiếng Việt** |
| **Bắt âm thanh Tab trình duyệt** | ❌ | ❌ | ❌ | ❌ | **✅ Chrome Extension bắt mọi tab web** |
| **Ghi âm trực tiếp tại giảng đường**| ✅ | ❌ | ❌ | ❌ | **✅ Live-caption qua Mic trên Mobile App**|
| **Đa nền tảng (Mobile & PC)** | Có | Chỉ xem | Chỉ PC | Chỉ PC/Mobile | **✅ Đồng bộ Mobile App & Extension** |

---

## 4. ĐIỂM ĐỘT PHÁ VÀ GIÁ TRỊ CỦA ĐỀ TÀI (UNIQUE VALUE PROPOSITION)

Hệ thống của nhóm mang lại giải pháp toàn diện bằng việc kết hợp các ưu điểm mạnh nhất:

1. **Kiến trúc Serverless-Audio (Tiết kiệm 95% tài nguyên):**
   * Người dùng chỉ gửi đường link URL. Máy chủ tự động bóc tách luồng âm thanh nén siêu nhẹ để AI xử lý mà không cần trung chuyển luồng hình ảnh video nặng nề.
2. **Khả năng "tạo phụ đề từ con số 0":**
   * Tích hợp mô hình Deep Learning **OpenAI Whisper**, có khả năng phiên âm chuẩn xác mọi video dù video đó không hề có phụ đề từ trước.
3. **Mô hình "2 trong 1" độc đáo:**
   * **Khi ngồi trên máy tính:** Dùng Extension để bắt âm thanh trực tiếp từ bất kỳ tab học tập nào và đè lớp phụ đề (Overlay) lên video.
   * **Khi di chuyển / Ngồi trên lớp:** Dùng Mobile App để vừa nghe giảng trực tiếp bằng micro (Live-caption), vừa ôn tập lại các bản tóm tắt bài học.
4. **Chi phí vận hành tối ưu (0 đồng):**
   * Toàn bộ pipeline từ ASR (Whisper) đến NLP (Summarizer) đều có thể chạy trên hạ tầng cục bộ (Localhost) hoặc tận dụng các API miễn phí, không phát sinh chi phí duy trì cho sinh viên và nhà trường.
