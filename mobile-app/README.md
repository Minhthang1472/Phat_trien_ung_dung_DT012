# HƯỚNG DẪN DỰ ÁN ỨNG DỤNG DI ĐỘNG (MOBILE APP)

Ứng dụng di động được xây dựng bằng **React Native (Expo)** để hỗ trợ cả Android và iOS với các chức năng chính:
1. **Dán liên kết URL bài giảng:** Tự động gửi link lên Backend AI để nhận phụ đề và đọc bản tóm tắt.
2. **Ghi âm trực tiếp tại giảng đường (Live-Caption):** Sử dụng micro của điện thoại để nhận diện giọng nói và hiển thị phụ đề trực tiếp trên màn hình.
3. **Đọc tóm tắt bài giảng & câu hỏi trắc nghiệm:** Giúp ôn tập nhanh bài học trước kỳ thi.

---

## 1. Khởi tạo ứng dụng với Expo (Thực hiện khi bắt đầu Tuần 6)
Khi đến giai đoạn phát triển App di động, chạy lệnh sau trong thư mục `mobile-app`:
```bash
npx create-expo-app@latest . --template blank
```

## 2. Cài đặt các thư viện bổ trợ
```bash
npx expo install expo-av @react-native-async-storage/async-storage
npm install axios lucide-react-native
```

## 3. Chạy ứng dụng trên điện thoại
```bash
npx expo start
```
Sau đó dùng app **Expo Go** trên điện thoại Android/iPhone quét mã QR trên màn hình máy tính để trải nghiệm trực tiếp!
