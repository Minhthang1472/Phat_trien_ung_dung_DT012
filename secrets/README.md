# Thư mục chứa thông tin xác thực khi chạy bằng Docker

Đặt file `serviceAccountKey.json` của Firebase vào thư mục này trước khi chạy:

```bash
docker compose up --build
```

Thư mục này được mount read-only vào container tại `/app/secrets`. File
`serviceAccountKey.json` đã được `.gitignore` bảo vệ và không bao giờ commit.
