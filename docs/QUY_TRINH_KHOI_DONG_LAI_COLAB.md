# ⚡ QUY TRÌNH KHỞI ĐỘNG LẠI SERVER AI TRÊN GOOGLE COLAB (LẦN SAU)

Mỗi khi bạn tắt máy tính hoặc phiên làm việc của Google Colab bị đóng, toàn bộ máy ảo tạm thời của Colab sẽ được làm mới. 

Lần sau khi cần bật lại Server AI để báo cáo đồ án hoặc test ứng dụng, bạn chỉ cần làm theo **3 bước siêu nhanh (mất đúng 1–2 phút)** dưới đây:

---

### BƯỚC 1: Mở File Notebook đã lưu
* Cách A: Mở trực tiếp file Notebook bạn đã lưu trên Google Drive.
* Hoặc Cách B: Vào [colab.research.google.com](https://colab.research.google.com/) $\rightarrow$ Chọn thẻ **Tải lên (Upload)** $\rightarrow$ Chọn file **[`backend_ai_colab.ipynb`](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend_ai_colab.ipynb)** từ thư mục dự án của bạn.

> ⚠️ **Kiểm tra GPU**: Đảm bảo góc trên bên phải hiển thị **T4** (hoặc vào menu *Thời gian chạy* $\rightarrow$ *Thay đổi loại thời gian chạy* $\rightarrow$ Chọn *T4 GPU*).

---

### BƯỚC 2: Kéo File Khóa `serviceAccountKey.json` Vào
1. Bấm vào biểu tượng hình thư mục 📁 ở cột bên trái Colab.
2. Kéo và thả file **`serviceAccountKey.json`** từ máy tính vào khung thư mục đó.

---

### BƯỚC 3: Bấm Duy Nhất 1 Nút "Chạy Tất Cả" (Run All)
1. Trên thanh menu, chọn: **Thời gian chạy (Runtime)** $\rightarrow$ **Chạy tất cả (Run all)** (hoặc bấm tổ hợp phím `Ctrl + F9`).
2. Toàn bộ 4 ô code sẽ tự động chạy nối tiếp nhau:
   * Tự kéo mã nguồn GitHub mới nhất về.
   * Tự tạo cấu hình `.env` cho GPU.
   * Tự bật Ollama và nạp Qwen 2.5 vào VRAM card T4.
   * Tự tạo đường hầm Cloudflare và bật Server FastAPI.
3. Bạn chỉ cần cuộn xuống ô cuối cùng, nhìn thông báo:
   ```text
   🎉 ĐƯỜNG LINK BACKEND CỦA BẠN LÀ:
   👉 https://xxxx-xxxx.trycloudflare.com
   🔥 ĐÃ TỰ ĐỘNG ĐỒNG BỘ LINK LÊN FIREBASE FIRESTORE THÀNH CÔNG!
   ```
4. **Ứng dụng điện thoại sẽ TỰ ĐỘNG nhận diện link mới từ Firebase** mà bạn không cần phải copy/paste thủ công nữa! (Hoặc bạn có thể bấm nút "🔥 Lấy link từ Firebase" trong Cài đặt của App).
