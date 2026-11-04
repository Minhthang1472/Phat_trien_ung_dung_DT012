# Phát hành mobile app (Expo SDK 57)

## 1. Liên kết dự án Expo/EAS

`src/mobile-app/app.config.js` đọc `app.json` rồi bổ sung cấu hình từ biến môi
trường. Không hardcode `projectId` trong repo.

```powershell
cd src/mobile-app
npm install -g eas-cli
eas login
eas init          # tạo/lấy projectId, ghi vào expo.dev
```

Đặt biến môi trường khi build local:

```powershell
$env:EAS_PROJECT_ID = "<uuid-tren-expo.dev>"
$env:EXPO_OWNER = "<tai-khoan-hoac-organization>"   # tùy chọn
$env:EXPO_PUBLIC_API_URL = "https://api.example.com"
```

Trên GitHub, thêm:

- Secret `EXPO_TOKEN`: access token tại
  `https://expo.dev/accounts/<owner>/settings/access-tokens`.
- Variables `EAS_PROJECT_ID`, `EXPO_OWNER`, `EXPO_PUBLIC_API_URL`.

Workflow `.github/workflows/mobile-eas.yml` chạy thủ công và tự bỏ qua bước
build nếu thiếu `EXPO_TOKEN`.

## 2. Build

```powershell
# APK nội bộ để cài thử
eas build --profile preview --platform android

# AAB cho Google Play + IPA cho App Store
eas build --profile production --platform all

# Build local (cần Android SDK / Xcode)
eas build --profile preview --platform android --local
```

`production` tự tăng `versionCode`/`buildNumber` (`autoIncrement: true`,
`appVersionSource: local`). Phiên bản hiển thị lấy từ `app.json`.

## 3. Cập nhật OTA (expo-updates)

- Đã cài `expo-updates`; `updates.url` được tạo tự động từ `EAS_PROJECT_ID`.
- `runtimeVersion` dùng `policy: appVersion`, nên **tăng `version` trong
  `app.json`** khi thay đổi native, và chỉ phát OTA cho cùng runtime.
- Phát bản cập nhật JS:

```powershell
eas update --branch production --message "Sua loi hien thi phu de"
```

- OTA không thay đổi được native code, permission, icon hay splash. Những thay
  đổi đó cần build store mới.
- Kiểm tra kênh: `eas channel:list`, `eas update:list --branch production`.

## 4. Submit lên store

Cấu hình trong `eas.json` mục `submit.production` (Apple ID, ASC App ID, team
ID; Google Play service account JSON). Sau đó:

```powershell
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Checklist Google Play:

- [ ] AAB đã ký bằng upload key; bật Play App Signing.
- [ ] Điền **Data safety**: dữ liệu thu thập (email, video/audio bài giảng,
      lịch sử học), mục đích, mã hoá khi truyền, quyền xoá dữ liệu.
- [ ] Nội dung người dùng (video bài giảng) + chính sách bản quyền/DMCA.
- [ ] Mô tả ngắn/dài, ảnh chụp màn hình, feature graphic, icon 512×512.
- [ ] Chính sách quyền riêng tư công khai (dùng
      `docs/PRIVACY_POLICY.md` sau khi rà soát).
- [ ] Khai báo quyền micro (Live-Caption) và giải thích lý do.
- [ ] Test internal track trước khi mở production.

Checklist App Store:

- [ ] Bundle ID `com.edtechai.lecture`, chứng chỉ/ký đúng.
- [ ] App Privacy nutrition label khớp dữ liệu thực tế.
- [ ] Ảnh chụp màn hình các kích thước bắt buộc.
- [ ] Tài khoản demo cho reviewer (nếu cần đăng nhập).
- [ ] Giải thích quyền micro và background audio (nếu dùng).
- [ ] Chính sách quyền riêng tư + điều khoản sử dụng.

## 5. Kiểm thử trước phát hành

- Đăng ký → xác minh OTP → đăng nhập → refresh token.
- Dán link YouTube → xử lý → xem phụ đề → tóm tắt → quiz.
- Upload file video/audio và file phụ đề.
- Xuất PDF/DOCX/Markdown.
- Live-Caption (quyền micro) và WebSocket.
- Mất mạng giữa chừng: app dùng cache AsyncStorage và báo lỗi rõ ràng.
- Đăng xuất, vô hiệu hoá tài khoản, đăng nhập lại sau khi được khôi phục.
- Kiểm tra trên màn hình nhỏ, chữ lớn, chế độ tối (nếu hỗ trợ).

## 6. Phiên bản & rollback

1. Tăng `version` trong `app.json` khi có thay đổi native.
2. Build production mới; phát OTA cùng runtime nếu chỉ sửa JS.
3. Nếu OTA lỗi: `eas update:rollback --branch production` hoặc phát bản update
   trước đó. Nếu app không khởi động được, yêu cầu người dùng cập nhật store.
4. Giữ AAB/IPA của bản ổn định gần nhất để đối chiếu.
