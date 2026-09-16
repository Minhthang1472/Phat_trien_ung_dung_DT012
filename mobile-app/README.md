# HƯỚNG DẪN ỨNG DỤNG DI ĐỘNG (MOBILE APP) - LECTURE AI CAPTION

Ứng dụng di động được xây dựng bằng **React Native (Expo)** để hỗ trợ cả Android và iOS, đồng bộ hoàn toàn với Backend FastAPI AI và cơ chế Caching MongoDB / Firebase Firestore.

---

## 📱 CÁC CHỨC NĂNG CHÍNH ĐÃ TRIỂN KHAI

1. **🔗 Nhập URL bài giảng (YouTube, Drive, LMS):**
   - Tự động gửi link lên Backend AI (`POST /api/video/process`) để nhận phụ đề và bản tóm tắt.
   - Hỗ trợ chọn ngôn ngữ đích: Tiếng Việt (vi), English (en), Nhật Bản (ja)...
   - Tự động lưu lịch sử bài giảng vào bộ nhớ đệm (AsyncStorage) để học Offline khi mất mạng.

2. **💬 Trình phát & Đồng bộ Phụ đề Thời gian thực (Sync Player Screen):**
   - Hiển thị phụ đề theo phong cách **Spotify Lyrics**: Câu phụ đề đang phát sẽ tự động sáng rực và phóng to (⭐ ĐANG PHÁT).
   - **Interactive Seek:** Chạm vào bất kỳ câu phụ đề nào, video/audio sẽ tự động tua đến đúng giây đó.
   - Thanh tiến trình Timeline, nút Tua nhanh/lùi 10s, Play/Pause.

3. **📑 Tóm tắt bài học & Trắc nghiệm Tự ôn tập (Summary & Quiz Screen):**
   - Tóm tắt tổng quan súc tích + Danh sách điểm kiến thức cốt lõi + Thuật ngữ quan trọng.
   - **Bộ câu hỏi trắc nghiệm tương tác:** Chạm chọn đáp án A/B/C/D, kiểm tra đúng/sai ngay lập tức kèm giải thích chi tiết.
   - Nút chia sẻ/xuất tài liệu ôn tập.

4. **🎙️ Nhận diện trực tiếp tại giảng đường (Live-Caption Screen):**
   - Kết nối qua WebSocket AI (`/api/live/stream`) để nhận diện lời thầy cô theo thời gian thực.
   - Hiển thị chữ to, rõ ràng, tự động cuộn xuống dòng mới nhất.
   - Tích hợp chế độ mô phỏng thông minh (Demo Simulation) cho phép thử nghiệm giao diện ngay cả khi chưa bật server.

5. **⚙️ Cấu hình Server linh hoạt (Server Modal):**
   - Đổi IP máy tính / Backend URL trực tiếp trên giao diện điện thoại (không cần sửa code).
   - Nút "Kiểm tra kết nối" kiểm tra trạng thái Backend Online/Offline ngay lập tức.

---

## 🚀 CÁCH CHẠY ỨNG DỤNG TRÊN ĐIỆN THOẠI

### 1. Khởi động Expo Server
Trong thư mục `mobile-app`, chạy lệnh:
```bash
npx expo start
```
*(Hoặc `npm start`)*

### 2. Trải nghiệm trên điện thoại thật
1. Tải ứng dụng **Expo Go** trên App Store (iOS) hoặc Google Play (Android).
2. Mở camera điện thoại (hoặc app Expo Go) quét mã QR hiển thị trên màn hình terminal.
3. Ứng dụng sẽ tự động tải bundle và mở lên trên điện thoại của bạn!

### 3. Trải nghiệm trên trình duyệt Web (Máy tính)
Nếu muốn xem thử nhanh giao diện trên trình duyệt máy tính:
```bash
npx expo start --web
```
*(Cần cài gói `@expo/metro-runtime` nếu Expo yêu cầu)*
