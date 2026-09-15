# ĐỒ ÁN: ỨNG DỤNG TỰ ĐỘNG TÓM TẮT VÀ ĐỒNG BỘ PHỤ ĐỀ ĐA NGÔN NGỮ CHO VIDEO BÀI GIẢNG

* **Học phần:** Phát triển Ứng dụng
* **Trường:** Đại học Lạc Hồng (LHU) - Khoa Công nghệ Thông tin
* **Giáo viên hướng dẫn:** ThS. Phan Mạnh Thường
* **Nhóm sinh viên thực hiện:**
  1. **Võ Trần Minh Thắng** (MSSV: `123001472` - Nhóm trưởng)
  2. **Vũ Đình Khánh Long** (MSSV: `123001217`)

---

## 📌 DANH MỤC HỒ SƠ TÀI LIỆU DỰ ÁN

| Tài liệu | Nội dung chính |
| :--- | :--- |
| 🚀 **[Hướng dẫn Cài đặt & Chạy Hệ thống](docs/HUONG_DAN_CAI_DAT_VA_CHAY_HE_THONG.md)** | **CẨM NANG TOÀN DIỆN**: Chi tiết đã cài những gì (thư viện, Firebase, Gemini) và cách chạy từ A-Z |
| 📋 **[Báo cáo Tiến độ Tuần 3-5](docs/BAO_CAO_TIEN_DO_TUAN_03_05.md)** | Bản báo cáo học thuật chính thức Giai đoạn 02 nộp cho GVHD Phan Mạnh Thường |
| 📋 **[Báo cáo Tiến độ Tuần 1-2](docs/BAO_CAO_TIEN_DO_TUAN_01_02.md)** | Bản báo cáo học thuật chính thức Giai đoạn 01 nộp cho GVHD Phan Mạnh Thường |
| 🏗️ **[Thiết kế Kiến trúc & Cơ sở Dữ liệu](docs/THIET_KE_KIEN_TRUC_VA_DATABASE.md)** | Kiến trúc 4 tầng, Sơ đồ tuần tự tương tác (Mermaid) & Data Dictionary MongoDB |
| 🎨 **[Thiết kế Giao diện UI/UX](docs/THIET_KE_GIAO_DIEN_UI_UX.md)** | Bản vẽ Wireframe cho Mobile App (4 màn hình) và Chrome Extension |
| 🔍 **[Tổng quan Bài toán & Khảo sát Thị trường](TONG_QUAN_BAI_TOAN_VA_GIAI_PHAP.md)** | Bối cảnh, nỗi đau người học, so sánh đối thủ (Otter.ai, NoteGPT, CapCut...) |
| 🗓️ **[Tìm hiểu Đề tài & Kế hoạch 15 tuần](TIM_HIEU_DE_TAI_VA_YEU_CAU.md)** | Mục tiêu, công nghệ và lộ trình 6 giai đoạn |

---

## 🚀 CÁCH KHỞI ĐỘNG NHANH DỰ ÁN

### 1. Chạy thử nghiệm AI bóc tách video bất kỳ:
```powershell
cd backend-ai
.\.venv\Scripts\python poc_test.py "LINK_YOUTUBE"
```

### 2. Bật máy chủ Backend API:
```powershell
cd backend-ai
.\.venv\Scripts\python run_server.py
```
* Xem tài liệu API tương tác tại: **`http://127.0.0.1:8000/docs`**

### 3. Cài đặt Tiện ích Chrome Extension:
* Mở Chrome/Edge vào `chrome://extensions` $\rightarrow$ Bật **Developer mode** $\rightarrow$ Bấm **Load unpacked** $\rightarrow$ Chọn thư mục `browser-extension`.
