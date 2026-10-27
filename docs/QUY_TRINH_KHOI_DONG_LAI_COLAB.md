# ⚡ HƯỚNG DẪN CÀI ĐẶT & KHỞI ĐỘNG LẠI GOOGLE COLAB (ĐẦY ĐỦ 100%)

Tài liệu này cung cấp **đầy đủ mã nguồn và các bước thực hiện** để bạn có thể khởi động lại Server AI (FastAPI + Faster-Whisper + Ollama Qwen 2.5 + Cloudflare Tunnel + Firebase) trên Google Colab bất kỳ lúc nào.

---

## 🎯 CÁCH 1: DÙNG FILE NOTEBOOK CÓ SẴN (NHANH NHẤT - 1 PHÚT)

Trong thư mục dự án của bạn đã có sẵn 2 file notebook hoàn chỉnh:
* [`backend_ai_colab.ipynb`](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/backend_ai_colab.ipynb)
* [`PTUD.ipynb`](file:///c:/Users/thang/Desktop/Phát%20triển%20ứng%20dụng/PTUD.ipynb)

### Các bước thực hiện:
1. Truy cập vào **[colab.research.google.com](https://colab.research.google.com/)** $\rightarrow$ Chọn thẻ **Tải lên (Upload)** $\rightarrow$ Chọn file `backend_ai_colab.ipynb` hoặc `PTUD.ipynb`.
2. **Kiểm tra GPU:** Nhìn vào góc trên bên phải màn hình Colab:
   * Nếu hiển thị **T4** $\rightarrow$ Đã chuẩn.
   * Nếu chưa có GPU: Vào menu **Thời gian chạy (Runtime)** $\rightarrow$ **Thay đổi loại thời gian chạy (Change runtime type)** $\rightarrow$ Chọn **T4 GPU** $\rightarrow$ Bấm **Lưu (Save)**.
3. **Kéo khóa Firebase:** Bấm vào biểu tượng **📁 (Tệp/Files)** ở thanh công cụ bên trái Colab $\rightarrow$ Kéo thả file **`serviceAccountKey.json`** từ máy tính vào đó.
4. **Bấm chạy:** Trên thanh menu, chọn: **Thời gian chạy (Runtime)** $\rightarrow$ **Chạy tất cả (Run all)** (hoặc phím tắt `Ctrl + F9`).
5. Đợi khoảng 1–2 phút, cuộn xuống ô cuối cùng để thấy link Cloudflare và hoàn tất!

---

## 📋 CÁCH 2: TỰ TẠO SỔ TAY VÀ ĐIỀN CODE THỦ CÔNG

Nếu bạn muốn tạo một sổ tay Colab mới hoàn toàn từ đầu, hãy mở một Colab trắng và tạo đúng **3 ô mã nguồn (Code Cell)** sau:

---

### 🟢 Ô CODE 1: Chuẩn bị môi trường, tải mã nguồn & cấu hình GPU

> Nhấn `+ Mã (+ Code)` và dán toàn bộ đoạn sau vào:

```python
# ==============================================================================
# Ô 1: CHUẨN BỊ MÔI TRƯỜNG, TẢI MÃ NGUỒN & KHỞI TẠO CẤU HÌNH GPU
# ==============================================================================
%cd /content

# 1. Cài đặt các công cụ hệ thống (ffmpeg, zstd, pciutils để Ollama nhận diện Tesla T4)
print("📦 [1/5] Đang cài đặt công cụ hệ thống...")
!apt-get update -qq && apt-get install -y -qq ffmpeg zstd pciutils

# 2. Tải mã nguồn mới nhất từ GitHub nhánh Tuan8
print("📥 [2/5] Đang tải mã nguồn dự án...")
!rm -rf /content/Phat_trien_ung_dung_DT012
!git clone -b Tuan8 https://github.com/Minhthang1472/Phat_trien_ung_dung_DT012.git

# 3. Cài đặt thư viện Python & GPU CUDA runtime cho Whisper
print("🐍 [3/5] Đang cài đặt thư viện Python & GPU CUDA runtime...")
%cd /content/Phat_trien_ung_dung_DT012/src/backend-ai
!pip install -q -r requirements.txt
!pip install -q "av<19" nvidia-cublas-cu12 nvidia-cudnn-cu12

# 4. Nạp file cấu hình Firebase (serviceAccountKey.json)
import shutil, os
if os.path.exists('/content/serviceAccountKey.json'):
    shutil.copy('/content/serviceAccountKey.json', '/content/Phat_trien_ung_dung_DT012/src/backend-ai/serviceAccountKey.json')
    print("🔑 [4/5] Đã nạp khóa Firebase thành công!")
else:
    print("⚠️ [4/5] Lưu ý: Nếu bạn chưa kéo file serviceAccountKey.json vào /content, hãy kéo vào để backend kết nối Firebase!")

# 5. Tạo cấu hình .env tối ưu GPU Tesla T4
with open('/content/Phat_trien_ung_dung_DT012/src/backend-ai/.env', 'w') as f:
    f.write("""WHISPER_DEVICE=cuda
WHISPER_COMPUTE_TYPE=float16
WHISPER_MODEL_SIZE=base
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
""")

print("\n✅ HOÀN TẤT Ô 1: Môi trường & Cấu hình GPU Tesla T4 đã sẵn sàng!")
```

---

### 🟢 Ô CODE 2: Cài đặt Ollama & Nạp mô hình Qwen 2.5 vào GPU

> Nhấn `+ Mã (+ Code)` để tạo ô thứ 2 và dán đoạn sau vào:

```python
# ==============================================================================
# Ô 2: CÀI ĐẶT OLLAMA & NẠP MÔ HÌNH QWEN 2.5 (3B) LÊN VRAM GPU TESLA T4
# ==============================================================================
import subprocess, time

# 1. Cài đặt Ollama Linux (tự nhận diện GPU Tesla T4 nhờ có pciutils)
print("⏳ [1/4] Đang cài đặt Ollama...")
!curl -fsSL https://ollama.com/install.sh | sh

# 2. Khởi động Ollama Server chạy ngầm (ghi log ra file để chống đầy bộ đệm pipe)
print("🚀 [2/4] Đang khởi động Ollama Server...")
!pkill ollama
ollama_log = open('/content/ollama.log', 'w')
ollama_proc = subprocess.Popen(['ollama', 'serve'], stdout=ollama_log, stderr=ollama_log)
time.sleep(5)

# 3. Nạp mô hình Qwen 2.5 (3B)
print("📥 [3/4] Đang tải mô hình Qwen 2.5 (3B) về GPU (khoảng 1.9GB)...")
!ollama pull qwen2.5:3b

# 4. Làm nóng (Warmup) mô hình vào VRAM card Tesla T4 để phản hồi tức thì
print("🔥 [4/4] Đang kích hoạt mô hình vào VRAM GPU...")
!ollama run qwen2.5:3b "Xin chào"

print("\n✅ HOÀN TẤT Ô 2: Ollama & Qwen 2.5 3B đã nạp vào VRAM GPU Tesla T4 thành công!")
```

---

### 🟢 Ô CODE 3: Tạo đường hầm Cloudflare, tự đồng bộ Firebase & Chạy Server

> Nhấn `+ Mã (+ Code)` để tạo ô thứ 3 và dán đoạn sau vào:

```python
# ==============================================================================
# Ô 3: BẬT CLOUDFLARE TUNNEL, ĐỒNG BỘ LINK LÊN FIREBASE & CHẠY SERVER
# ==============================================================================
import time, re, os, nvidia.cublas.lib, nvidia.cudnn.lib

# 1. Cấu hình biến môi trường CUDA để Whisper luôn chạy trên GPU Tesla T4
os.environ["LD_LIBRARY_PATH"] = f"{nvidia.cublas.lib.__path__[0]}:{nvidia.cudnn.lib.__path__[0]}:{os.environ.get('LD_LIBRARY_PATH', '')}"

# 2. Dọn dẹp các tiến trình cũ
!pkill cloudflared
!pkill uvicorn

# 3. Tải và tạo đường hầm Cloudflare Tunnel
print("🌐 Đang tạo đường hầm Cloudflare...")
!wget -nc -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
!chmod +x cloudflared
!nohup ./cloudflared tunnel --url http://127.0.0.1:8000 > tunnel.log 2>&1 &

# 4. Vòng lặp chờ tối đa 25 giây để bắt chuẩn xác 100% link Cloudflare
server_url = None
for _ in range(25):
    time.sleep(1)
    if os.path.exists('tunnel.log'):
        with open('tunnel.log', 'r') as f:
            found = re.findall(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', f.read())
            if found:
                server_url = found[-1]
                break

if server_url:
    print("\n" + "="*60)
    print(f"🎉 ĐƯỜNG LINK BACKEND CỦA BẠN LÀ:\n👉 {server_url}")
    print("="*60)
    print(f"Kiểm tra Swagger Docs tại: {server_url}/docs\n")
    
    # 5. Tự động đồng bộ đường link mới lên Firebase Firestore (App tự nhận diện)
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        key_path = '/content/Phat_trien_ung_dung_DT012/src/backend-ai/serviceAccountKey.json'
        if os.path.exists(key_path):
            if not firebase_admin._apps:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            db = firestore.client()
            db.collection('system_config').document('server').set({
                'url': server_url,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            print("🔥 ĐÃ TỰ ĐỘNG ĐỒNG BỘ LINK LÊN FIREBASE THÀNH CÔNG! (App tự nhận diện)")
    except Exception as e:
        print(f"ℹ️ Lưu ý Firebase: {e}")
else:
    print("⚠️ Chưa bắt được link tự động, log tunnel:")
    if os.path.exists('tunnel.log'):
        with open('tunnel.log', 'r') as f:
            print(f.read())

# 6. Khởi chạy Server FastAPI
%cd /content/Phat_trien_ung_dung_DT012/src/backend-ai
!uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 📱 KẾT NỐI VỚI MOBILE APP / WEB

Khi **Ô 3** chạy xong, bạn sẽ thấy thông báo:
```text
🎉 ĐƯỜNG LINK BACKEND CỦA BẠN LÀ:
👉 https://xxxx-xxxx.trycloudflare.com
🔥 ĐÃ TỰ ĐỘNG ĐỒNG BỘ LINK LÊN FIREBASE THÀNH CÔNG!
```

* **Tự động:** Ứng dụng điện thoại / Web sẽ **tự động đọc link từ Firebase Firestore** mà bạn không cần phải làm gì thêm!
* **Thủ công (nếu cần):** Vào mục **Cài đặt (Settings)** trên ứng dụng $\rightarrow$ Bấm nút **🔥 Lấy link từ Firebase** (hoặc dán trực tiếp đường link `https://xxxx.trycloudflare.com` vào ô Backend URL rồi nhấn **Lưu & Kiểm tra**).
