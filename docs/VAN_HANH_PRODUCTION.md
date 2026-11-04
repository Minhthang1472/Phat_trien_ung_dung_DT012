# Vận hành production

Tài liệu này mô tả cách chạy backend bằng Docker + Caddy (HTTPS), sao lưu,
giám sát và các bước kiểm tra trước khi mở cho người dùng thật.

## 1. Chuẩn bị máy chủ

- Ubuntu 22.04/24.04 (hoặc VPS tương đương), 2 vCPU / 4 GB RAM tối thiểu cho
  Whisper CPU; GPU nếu chạy `WHISPER_DEVICE=cuda`.
- Cài Docker Engine + Docker Compose plugin.
- Mở firewall: `22/tcp`, `80/tcp`, `443/tcp` (và `443/udp` nếu dùng HTTP/3).
  **Không** mở `8000` ra Internet.
- Trỏ bản ghi DNS `A`/`AAAA` của `api.example.com` về IP máy chủ **trước** khi
  khởi động Caddy.

## 2. Cấu hình

```bash
cp .env.example .env
```

Các giá trị bắt buộc/sửa:

```dotenv
ENVIRONMENT=production
API_BIND=127.0.0.1
PUBLIC_API_URL=https://api.example.com
CORS_ORIGINS=https://app.example.com
ALLOWED_HOSTS=api.example.com
JWT_SECRET=<chuỗi ngẫu nhiên >= 32 ký tự>
ADMIN_TOKEN=<chuỗi ngẫu nhiên >= 32 ký tự>
METRICS_TOKEN=<chuỗi ngẫu nhiên >= 16 ký tự>
SMTP_HOST=smtp.example.com
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=no-reply@example.com
API_DOMAIN=api.example.com
ACME_EMAIL=ops@example.com
```

Đặt service account Firebase vào `./secrets/serviceAccountKey.json` (quyền
`600`, không commit). `settings.validate()` sẽ dừng tiến trình nếu thiếu cấu
hình bắt buộc ở production.

Sinh secret bằng PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 3. Khởi động

```bash
# Lần đầu hoặc sau khi đổi Dockerfile/requirements
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Xem trạng thái
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

Luồng request: `Internet -> Caddy (443) -> api:8000 (mạng Docker nội bộ)`.
Caddy tự xin/gia hạn chứng chỉ Let's Encrypt và chuyển WebSocket.

Kiểm tra:

```bash
python scripts/check_health.py --base-url https://api.example.com
curl -fsS https://api.example.com/health
curl -H "Authorization: Bearer $METRICS_TOKEN" https://api.example.com/metrics | head
```

`/docs` mặc định tắt ở production (`ENABLE_DOCS=false`). `/api/admin` trả 404
nếu `ADMIN_TOKEN` trống.

## 4. Sao lưu

### Firestore

```bash
python scripts/backup_firestore.py --out /var/backups/lecture-ai/firestore
```

### File upload / media

```bash
# Named volume của compose
python scripts/backup_uploads.py --docker-volume lecture_uploads \
  --out /var/backups/lecture-ai/uploads
```

### Lịch chạy mẫu (cron, 02:15 hằng ngày)

```cron
15 2 * * * cd /opt/lecture-ai && /usr/bin/python3 scripts/backup_firestore.py --out /var/backups/lecture-ai/firestore >> /var/log/lecture-ai-backup.log 2>&1
30 2 * * * cd /opt/lecture-ai && /usr/bin/python3 scripts/backup_uploads.py --docker-volume lecture_uploads --out /var/backups/lecture-ai/uploads >> /var/log/lecture-ai-backup.log 2>&1
```

Sau đó đồng bộ `/var/backups/lecture-ai` lên nơi khác (rclone/S3/Backblaze) và
bật mã hoá. Backup chứa hash mật khẩu, token phiên và OTP: bảo vệ như dữ liệu
mật.

### Khôi phục

```bash
# Kiểm tra trước
python scripts/restore_firestore.py --input /var/backups/lecture-ai/firestore/20260101-021500 --dry-run

# Ghi đè đúng trạng thái backup
python scripts/restore_firestore.py --input /var/backups/lecture-ai/firestore/20260101-021500

# Giải nén media vào volume (ví dụ)
docker run --rm -v lecture_uploads:/data -v /var/backups/lecture-ai/uploads:/backup \
  alpine sh -c "cd /data && tar xzf /backup/uploads-20260101-021500.tar.gz"
```

**Diễn tập khôi phục mỗi quý** trên môi trường staging để chắc chắn backup dùng
được, không chỉ tồn tại.

## 5. Giám sát & log

- `GET /health`: tiến trình còn sống.
- `GET /health/ready`: Firebase + thư mục upload + JWT sẵn sàng; dùng cho
  load balancer/uptime monitor.
- `GET /metrics`: Prometheus text; production yêu cầu
  `Authorization: Bearer $METRICS_TOKEN`.
- Mỗi response có `X-Request-ID`; log kèm request id để đối chiếu.
- Docker log đã giới hạn `10 MB x 5 file` cho `api` và `caddy`. Nếu dùng
  `LOG_FORMAT=json`, có thể đẩy log sang Loki/ELK/CloudWatch.
- Đặt uptime monitor bên ngoài gọi `/health/ready` mỗi 1–2 phút và cảnh báo
  khi lỗi hoặc chứng chỉ TLS sắp hết hạn.

Lệnh hữu ích:

```bash
docker stats
docker system df
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 api
```

## 6. Email giao dịch (OTP)

Để email OTP không vào spam và không bị giả mạo:

1. Dùng nhà cung cấp SMTP có uy tín hoặc dịch vụ giao dịch (SES, SendGrid,
   Mailgun, Postmark).
2. Tạo bản ghi DNS:
   - **SPF**: `v=spf1 include:<provider-spf> -all`
   - **DKIM**: bật ký và dán bản ghi do nhà cung cấp cấp.
   - **DMARC**: bắt đầu `v=DMARC1; p=none; rua=mailto:dmarc@example.com`,
     sau 2–4 tuần đổi `p=quarantine` rồi `p=reject`.
3. Dùng địa chỉ `SMTP_FROM` cùng domain đã cấu hình SPF/DKIM.
4. Theo dõi bounce/complaint; xử lý địa chỉ hỏng để tránh bị đánh dấu spam.
5. Ở production, thiếu SMTP backend sẽ fail-closed khi đăng ký/gửi OTP.

Kiểm tra:

```bash
dig +short TXT example.com
dig +short TXT _dmarc.example.com
dig +short TXT selector._domainkey.example.com
```

## 7. Redis và nhiều worker

Mặc định backend chạy **một worker** và giữ rate limit, job streaming, bộ đếm
đăng nhập trong RAM. Nếu cần scale ngang:

- Bật `REDIS_URL` để rate limit phân tán.
- Thay hàng đợi trong RAM bằng Celery/RQ và định tuyến job theo `job_id`.
- Chỉ tăng `--workers` sau khi đã chuyển các trạng thái trên ra khỏi RAM.
- Cấu hình load balancer sticky session nếu vẫn dùng WebSocket/streaming RAM.

## 8. Cập nhật phiên bản

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
python scripts/check_health.py --base-url https://api.example.com
```

Job streaming đang chạy trong RAM sẽ mất khi restart; hãy chọn thời điểm ít
người dùng. Firestore và file upload không bị ảnh hưởng.

## 9. Checklist trước khi mở traffic

- [ ] DNS + HTTPS hoạt động, chứng chỉ hợp lệ.
- [ ] `API_BIND=127.0.0.1`, firewall chỉ mở 22/80/443.
- [ ] `JWT_SECRET`, `ADMIN_TOKEN`, `METRICS_TOKEN` đã đổi khỏi giá trị mẫu.
- [ ] `ALLOWED_HOSTS`, `CORS_ORIGINS`, `PUBLIC_API_URL` đúng domain HTTPS.
- [ ] SMTP gửi được OTP; SPF/DKIM/DMARC đã cấu hình.
- [ ] `firebase deploy --only firestore:rules,firestore:indexes`.
- [ ] Đã chạy `scripts/backfill_cached_at.py` cho dữ liệu cũ.
- [ ] Backup Firestore + upload chạy được và đã thử restore.
- [ ] Uptime monitor + cảnh báo log/ổ đĩa.
- [ ] `docs/PRIVACY_POLICY.md` và `docs/TERMS_OF_SERVICE.md` đã được rà soát
      pháp lý và đăng công khai.
- [ ] Đã build mobile/extension bản production và kiểm thử luồng đăng nhập,
      upload, phát video, xuất tài liệu.
