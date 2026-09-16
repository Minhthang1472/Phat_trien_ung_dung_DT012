# Báo cáo Đánh giá Hệ thống & Hướng dẫn Bảo vệ Đồ án

Tài liệu này giúp bạn rà soát lại toàn bộ hệ thống trước khi nghiệm thu, đồng thời cung cấp "kịch bản" trả lời các câu hỏi phản biện của hội đồng (đặc biệt là câu hỏi về tính mới và sự khác biệt của dự án).

---

## 1. Kiểm tra lại toàn bộ hệ thống (System Check)

Hệ thống hiện tại đã tương đối hoàn thiện và sẵn sàng cho việc Demo. Tuy nhiên, để buổi bảo vệ diễn ra trơn tru nhất, bạn cần lưu ý các điểm sau:

### ✅ Những phần đã hoàn thiện tốt
- **Mobile App:** Giao diện tối (Dark mode) hiện đại, mượt mà. Đã tích hợp đầy đủ các tính năng: Phát video thật (expo-av), đồng bộ phụ đề thời gian thực (như Spotify), tính năng Quiz trắc nghiệm, và Live Caption qua WebSocket.
- **Backend:** Đã có kiến trúc xử lý audio ephemeral (chỉ trích xuất text, không lưu file âm thanh/video trên server) và cơ chế Caching để tiết kiệm chi phí API.

### ⚠️ Những điểm cần lưu ý/khắc phục trước khi Demo
- **Lỗi AsyncStorage chữ đỏ:** Bạn **BẮT BUỘC** phải chạy lệnh `npx expo start -c --tunnel` ít nhất một lần để Expo xóa cache và nhận diện gói `async-storage` mới cài, nếu không chức năng "Lịch sử xem" sẽ không lưu được.
- **Kết nối mạng khi Demo thật:** Khi mang máy lên trường báo cáo, mạng Wi-Fi của trường sẽ khác mạng ở nhà. IP của máy tính (chạy Backend) sẽ bị thay đổi. 
  👉 **Cách xử lý:** Bật server Backend lên -> Lấy địa chỉ IPv4 mới của máy tính -> Mở Mobile App -> Bấm vào biểu tượng ⚙️ (Bánh răng) góc phải màn hình -> Nhập IP mới vào để App có thể gọi API.

---

## 2. Kịch bản Trả lời Phản biện (Selling Points)

Nếu thầy cô trong hội đồng hỏi: *"Đồ án này của em có gì hơn so với những app/web học ngoại ngữ, dịch video hay auto-caption ngoài kia?"*, bạn hãy dùng 4 luận điểm "sát thủ" sau đây:

### 🏆 Luận điểm 1: Kiến trúc Tối ưu Chi phí và Băng thông (Cost & Storage Efficiency)
> *"Thưa thầy cô, các web dịch video truyền thống thường tải video về, hard-sub (đốt phụ đề vào video) rồi lưu lại trên server. Việc này tốn hàng TB dung lượng và băng thông. 
> Hệ thống của nhóm em **KHÔNG lưu trữ video**. Server chỉ lưu duy nhất đường link URL gốc và file text phụ đề đã dịch. Ở phía Mobile, tụi em stream trực tiếp video từ nguồn và tự render phụ đề phủ lên trên. Kèm theo đó là cơ chế **Caching**: Video nào đã có người yêu cầu dịch 1 lần, các sinh viên sau chỉ việc kéo text từ Database về (tránh bị Rate Limit và tốn tiền gọi API của Google/OpenAI). Đây là kiến trúc tối ưu chi phí cực tốt cho khởi nghiệp."*

### 🏆 Luận điểm 2: Trải nghiệm UI/UX "Tương tác" (Interactive Learning vs Passive Watching)
> *"Các app hiện tại chỉ cho người dùng 'xem' phụ đề chạy thụ động phía dưới video. 
> App của em thiết kế giao diện lấy cảm hứng từ tính năng Lyrics của **Spotify**. Toàn bộ kịch bản bài giảng được hiển thị rõ ràng. Đặc biệt, sinh viên có thể **bấm vào bất kỳ câu nào** trên màn hình, video sẽ tự động tua ngay đến đúng mốc thời gian giáo sư nói câu đó. Điều này giúp việc học lại và tra cứu kiến thức nhanh hơn gấp 10 lần."*

### 🏆 Luận điểm 3: Đánh giá Tức thì (Generative AI Quiz)
> *"Sau khi xem xong bài giảng, app không bỏ mặc người học. Dựa trên nội dung text vừa bóc tách được, hệ thống AI sẽ tự động sinh ra bộ câu hỏi trắc nghiệm ôn tập (Summary & Quiz) ngay lập tức. Đây là một quy trình học khép kín từ: **Tiếp thu (Video) -> Phá vỡ rào cản ngôn ngữ (Subtitle) -> Đánh giá (Quiz)** mà rất ít app ngoài kia tích hợp đồng bộ."*

### 🏆 Luận điểm 4: Tính năng Live-Caption dành riêng cho Du học sinh (Bảo mật riêng tư)
> *"Ngoài dịch video có sẵn, app em còn giải quyết bài toán nghe giảng trực tiếp trên lớp bằng tính năng Live-Caption qua WebSocket. Thay vì bắt sinh viên dùng máy tính rườm rà, hạ tầng Backend xử lý nặng được đặt tại nhà, sinh viên chỉ cần mở App, bật Micro. 
> Về vấn đề quyền riêng tư, Backend áp dụng kỹ thuật xử lý **Ephemeral**: Luồng âm thanh stream lên chỉ được dùng để nhận diện ra Text, sau đó bị hủy ngay lập tức trên RAM mà không hề lưu lại bất kỳ file audio nào xuống ổ cứng."*
