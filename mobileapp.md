# Kế hoạch Triển khai Ứng dụng Di động (Mobile App) React Native Expo

Ứng dụng di động được xây dựng dựa trên React Native (Expo) theo đúng bản đặc tả kỹ thuật và thiết kế Wireframe tại [`docs/THIET_KE_GIAO_DIEN_UI_UX.md`](file:///d:/Code/Phat_trien_ung_dung_DT012/docs/THIET_KE_GIAO_DIEN_UI_UX.md) kết nối đồng bộ với FastAPI Backend tại [`backend-ai`](file:///d:/Code/Phat_trien_ung_dung_DT012/backend-ai).

---

## User Review Required

> [!IMPORTANT]
> **Cấu hình Địa chỉ IP Backend cho Mobile:**
> Khi chạy trên điện thoại thật qua Expo Go hoặc trên máy ảo Android/iOS:
> - `localhost` hoặc `127.0.0.1` chỉ trỏ tới chính điện thoại, không gọi được vào máy tính chạy backend.
> - Dự án sẽ hỗ trợ cơ chế tự động nhận diện hoặc cho phép cấu hình URL Backend (ví dụ: `http://192.168.x.x:8000` cho điện thoại cùng mạng Wi-Fi, hoặc `http://10.0.2.2:8000` cho Android Emulator, `http://localhost:8000` khi chạy trên Web). Màn hình cài đặt nhanh hoặc modal config IP sẽ được tích hợp ngay trên App.

---

## Proposed Changes

Ứng dụng sẽ được khởi tạo và phát triển hoàn chỉnh trong thư mục `mobile-app`:

### 1. Khởi tạo & Cấu trúc Thư mục Nền tảng

- Khởi tạo Expo project trong [`mobile-app`](file:///d:/Code/Phat_trien_ung_dung_DT012/mobile-app).
- Cài đặt các thư viện cần thiết:
  - `@react-navigation/native`, `@react-navigation/native-stack`: Quản lý điều hướng màn hình mượt mà.
  - `expo-av`: Phát âm thanh/video bài giảng và xử lý ghi âm.
  - `axios`: Gọi API tới FastAPI Backend.
  - `lucide-react-native`, `react-native-svg`: Hệ thống Icon hiện đại.
  - `@react-native-async-storage/async-storage`: Lưu lịch sử bài giảng và cấu hình IP offline.

Cấu trúc mã nguồn chuẩn bị triển khai:
```
mobile-app/
├── App.js                       # Điểm khởi đầu ứng dụng & Navigation Container
├── app.json                     # Cấu hình Expo
├── package.json
└── src/
    ├── constants/
    │   ├── theme.js             # Bảng màu Dark/Light Mode, Typography & Spacing
    │   └── config.js            # Địa chỉ Backend URL mặc định & Storage keys
    ├── services/
    │   ├── api.js               # Service gọi REST API (process, history, export)
    │   └── websocketService.js  # Service kết nối WebSocket Live-Caption
    ├── components/
    │   ├── Header.js            # Header thanh điều hướng với trạng thái server
    │   ├── LectureCard.js       # Thẻ hiển thị bài giảng gần đây
    │   ├── SubtitleItem.js      # Dòng phụ đề tương tác bấm nhảy giây
    │   ├── QuizCard.js          # Khối câu hỏi trắc nghiệm tương tác
    │   └── ServerModal.js       # Modal đổi nhanh IP Backend trực tiếp trên app
    └── screens/
        ├── HomeScreen.js        # Màn hình 1: Nhập link & Lịch sử bài giảng
        ├── SyncPlayerScreen.js  # Màn hình 2: Phát video & Phụ đề đồng bộ Seek
        ├── SummaryQuizScreen.js # Màn hình 3: Tóm tắt bài học & Bộ trắc nghiệm
        └── LiveCaptionScreen.js # Màn hình 4: Thu âm Mic & Nhận diện Realtime
```

---

### 2. Chi tiết Các Màn hình Chức năng

#### [NEW] `src/screens/HomeScreen.js`
- Hộp nhập liên kết bài giảng (YouTube, Drive, MP4...).
- Bộ chọn ngôn ngữ đích (`vi` - Tiếng Việt, `en` - English, `ja` - Tiếng Nhật).
- Nút bấm chính: **"⚡ Tạo phụ đề & Tóm tắt AI"** (có hiệu ứng loading khi server đang xử lý).
- Lựa chọn nhanh: **"🎙️ Bật Live-Caption qua Micro"** để nghe giảng trực tiếp tại lớp.
- Danh sách bài giảng gần đây được lấy tự động từ `GET /api/history` hoặc bộ nhớ đệm máy.

#### [NEW] `src/screens/SyncPlayerScreen.js`
- Khung phát Audio/Video bài giảng với thanh trượt tiến trình (Slider timeline), Play/Pause, tua 10s.
- Danh sách phụ đề đồng bộ (Spotify Lyrics style):
  - Tự động cuộn theo giây hiện tại (`currentTime`).
  - Dòng phụ đề đang phát được highlight màu sáng rực rỡ và phóng to chữ.
  - **Interactive Seek:** Người dùng chạm vào bất kỳ câu phụ đề nào, video/audio sẽ tự động nhảy đến đúng thời điểm đó.
- Nút chuyển nhanh sang xem Tóm tắt bài giảng.

#### [NEW] `src/screens/SummaryQuizScreen.js`
- Khối tóm tắt bài học: Tổng quan 1 đoạn văn súc tích + Danh sách các điểm kiến thức cốt lõi.
- Danh sách thuật ngữ & công thức quan trọng.
- **Bộ trắc nghiệm tương tác (Interactive Quiz):**
  - Người dùng bấm chọn đáp án A, B, C, D.
  - Kiểm tra kết quả ngay lập tức (xanh lá nếu đúng, đỏ nếu sai kèm lời giải thích chi tiết).

#### [NEW] `src/screens/LiveCaptionScreen.js`
- Giao diện phòng học trực tiếp với hiệu ứng sóng âm micro (Audio Wave pulse animation).
- Nút Bắt đầu / Tạm dừng / Dừng ghi âm.
- Kết nối tới WebSocket `/api/live/stream` để đẩy luồng âm thanh và nhận về text phụ đề trực tiếp.
- Khung hiển thị text lớn, dễ đọc từ xa trên giảng đường.

---

## Verification Plan

### Automated / Build Verification
- Khởi tạo project không lỗi cú pháp: `npx expo start --web` hoặc test bundle logic.
- Kiểm tra các imports và exports giữa các screens và services.

### Manual Verification Flow
1. **Kiểm tra Màn hình chính:** Mở app, giao diện hiển thị đúng chuẩn Wireframe, nhập link YouTube thử nghiệm.
2. **Kiểm tra Luồng Đồng bộ Phụ đề:** Mở một bài giảng mẫu, bấm Play, quan sát phụ đề nhảy theo thời gian thực và bấm vào 1 câu bất kỳ để kiểm tra chức năng Seek.
3. **Kiểm tra Tóm tắt & Trắc nghiệm:** Chuyển sang Tab Tóm tắt, làm thử 1 câu hỏi trắc nghiệm và xem phản hồi đúng/sai.
4. **Kiểm tra Live-Caption:** Bật màn hình ghi âm, quan sát trạng thái kết nối WebSocket.
