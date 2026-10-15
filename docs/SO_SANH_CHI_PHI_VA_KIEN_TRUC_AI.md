# BÁO CÁO PHÂN TÍCH: ƯỚC TÍNH CHI PHÍ TOKEN & SO SÁNH KIẾN TRÚC MÔ HÌNH AI

> **Dự án:** Ứng Dụng Phụ Đề & Tóm Tắt Bài Giảng Đa Ngôn Ngữ  
> **Chủ đề nghiên cứu:** Đánh giá Chi phí Sử dụng Token qua API bên thứ ba (Third-Party Cloud APIs) so với Tự triển khai Mô hình Cục bộ (Self-Hosted Local Models), kèm Biện luận Kiến trúc Hệ thống.

---

## 1. Giả Định Kỹ Thuật & Công Thức Tính Toán Lượng Token

Trong bài giảng trực tuyến (video YouTube, bài giảng ghi âm, LMS), đặc thù diễn đạt có tốc độ nói trung bình và mật độ từ vựng như sau:

- **Tốc độ nói trung bình của giảng viên:** `140 - 160 từ/phút` (lấy chuẩn `150 từ/phút`).
- **Tỉ lệ chuyển đổi Token trong xử lý ngôn ngữ tự nhiên (NLP):**
  - Tiếng Anh: 1 từ ≈ 1.3 - 1.4 tokens.
  - Tiếng Việt (âm tiết tách rời & Unicode): 1 từ ≈ 1.4 - 1.6 tokens.
  - Mức trung bình chuẩn hóa: **~210 tokens / phút video**.

### Bảng Ước Tính Lượng Token Tiêu Thụ Theo Thời Lượng Bài Giảng

| Thời lượng Video | Tổng số từ (Words) | Lượng Token Phiên Âm (Transcript) | Token Prompt & Tóm tắt 4 phần + Quiz | Tổng Token LLM Cần Dùng |
| :--- | :--- | :--- | :--- | :--- |
| **15 phút** | ~2,250 từ | ~3,150 tokens | ~900 tokens | **~4,050 tokens** |
| **30 phút** | ~4,500 từ | ~6,300 tokens | ~1,800 tokens | **~8,100 tokens** |
| **60 phút (1 tiết)** | ~9,000 từ | ~12,600 tokens | ~3,600 tokens | **~16,200 tokens** |
| **90 phút (2 tiết)** | ~13,500 từ | ~18,900 tokens | ~5,400 tokens | **~24,300 tokens** |
| **120 phút (buổi học)** | ~18,000 từ | ~25,200 tokens | ~7,200 tokens | **~32,400 tokens** |

---

## 2. Bảng So Sánh Chi Phí Thực Tế Giữa 2 Hướng Tiếp Cận

*(Đơn giá tham chiếu theo biểu phí thị trường điện toán đám mây: 1 USD ≈ 25,400 VNĐ)*

### Hướng 1: Thuê Cloud API bên thứ ba hoàn toàn (OpenAI Whisper + GPT-4o / DeepL)

- **Speech-to-Text (STT):** OpenAI Whisper API tính giá `$0.006 / phút`.
- **Dịch thuật & Tóm tắt (LLM):** GPT-4o tính trung bình `$5.00 / 1 triệu tokens` (gồm input và output).

| Thời lượng Video | Phí OpenAI Whisper | Phí GPT-4o (Dịch + Tóm tắt) | Tổng Chi Phí (USD) | Tổng Chi Phí (VNĐ) |
| :--- | :--- | :--- | :--- | :--- |
| **15 phút** | $0.090 | $0.020 | **$0.110** | **~2,800 VNĐ** |
| **30 phút** | $0.180 | $0.040 | **$0.220** | **~5,600 VNĐ** |
| **60 phút** | $0.360 | $0.081 | **$0.441** | **~11,200 VNĐ** |
| **90 phút** | $0.540 | $0.121 | **$0.661** | **~16,800 VNĐ** |
| **120 phút** | $0.720 | $0.162 | **$0.882** | **~22,400 VNĐ** |

> ⚠️ **Hệ quả quy mô (Scalability):**  
> Nếu một trường đại học hoặc trung tâm đào tạo có **1,000 sinh viên**, mỗi sinh viên xử lý 5 video/tháng (tổng 5,000 video 60 phút):
> - **Chi phí Cloud API phải trả mỗi tháng:** `5,000 × $0.441 = $2,205 USD` (**~56,000,000 VNĐ / tháng**).
> - Đây là chi phí biến đổi (Variable Cost) tăng tuyến tính và vô tận theo số lượng người dùng.

---

### Hướng 2: Tự Triển Khai Mô Hình Local Trên Máy Chủ Riêng (Faster-Whisper + MarianMT / Gemini Free Tier)

| Thành phần kỹ thuật | Công nghệ sử dụng | Chi phí Token | Tốc độ xử lý |
| :--- | :--- | :--- | :--- |
| **Bóc tách âm thanh** | `yt-dlp` + `FFmpeg` Stream (cắt keyframes) | **0 VNĐ** | < 1 giây |
| **Speech-to-Text** | `Faster-Whisper` (CTranslate2 INT8) Local | **0 VNĐ** | ~20 - 40 giây cho video 30p |
| **Dịch thuật đa ngữ** | `MarianMT` / Google Gemini API Free Tier | **0 VNĐ** | 1 - 2 giây |
| **Tóm tắt 4 phần & Trắc nghiệm** | AI Summary Engine + Firebase Cache | **0 VNĐ** | 3 - 5 giây |
| **Tổng chi phí Token** | — | **0 VNĐ / 0 USD** | Tiết kiệm 100% |

---

## 3. Biện Luận Kỹ Thuật: Vì Sao Hệ Thống Chọn Hướng Triển Khai Model Local?

Chúng tôi lựa chọn giải pháp **Mô hình Cục bộ (On-premise / Local Serving) kết hợp Hybrid Caching**, vì 4 lý do then chốt sau:

### 1. Bảo mật dữ liệu & Tuân thủ Bản quyền (Data Privacy & Compliance)
- Nhiều bài giảng đại học, các buổi họp hay seminar chứa nghiên cứu sáng chế và dữ liệu nội bộ chưa được công bố.
- Gửi toàn bộ tệp âm thanh/video lên máy chủ của bên thứ ba (OpenAI, DeepL) có nguy cơ vi phạm điều khoản bảo mật dữ liệu doanh nghiệp và chính sách quyền riêng tư học đường (FERPA, GDPR).
- Với Model Local, toàn bộ dữ liệu âm thanh nằm trọn vẹn trong hạ tầng kiểm soát nội bộ.

### 2. Tốc độ vượt trội với Faster-Whisper (CTranslate2 INT8)
- Mô hình `faster-whisper` sử dụng thư viện **CTranslate2** với kỹ thuật tối ưu lượng tử hóa trọng số (Quantization INT8/FP16), đạt hiệu suất:
  - Nhanh gấp **4 lần** so với thư viện `openai-whisper` nguyên bản.
  - Bộ nhớ RAM/VRAM yêu cầu giảm **hơn 50%** (chỉ tốn ~1.5GB VRAM cho model `small` / `base`).
  - Xử lý được ngay trên cả máy tính xách tay thông thường hoặc server CPU đa nhân mà không bắt buộc cụm GPU máy chủ đắt đỏ.

### 3. Thoát khỏi Rào cản Rate-Limit và Nghẽn Mạng Quốc Tế
- API bên thứ ba thường áp đặt giới hạn lượt gọi (Rate-limit: Requests per minute - RPM, Tokens per minute - TPM). Khi có hàng chục sinh viên cùng nộp bài cùng lúc, hệ thống dùng API đám mây sẽ liên tục gặp lỗi `HTTP 429 Too Many Requests`.
- Xử lý Local chạy hoàn toàn trong mạng LAN hoặc máy chủ nội bộ, loại bỏ triệt để độ trễ đường truyền Internet quốc tế.

### 4. Kiến trúc Hybrid Firestore Caching: "Xử lý một lần - Dùng mãi mãi"
- Mỗi bài giảng sau khi bóc tách phụ đề và sinh tóm tắt sẽ được lưu vào kho lưu CSDL Firestore.
- Các sinh viên khác cùng xem một video chỉ tốn **0 giây** tải từ Cache và **tiêu thụ 0 token**, tối ưu hóa tuyệt đối tài nguyên tính toán.

---

## 4. Kết Luận
Hướng tiếp cận **Model Local (Faster-Whisper)** mang lại lợi thế áp đảo về **chi phí lâu dài (0 đồng)**, **tính độc lập công nghệ**, và **bảo mật học thuật**, là giải pháp tối ưu bền vững nhất cho bài toán trợ lý học tập đa ngôn ngữ trong môi trường giáo dục.
