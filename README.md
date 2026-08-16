# Bot tự động trả lời Fanpage Facebook

## 1. Cài đặt
```bash
npm install
```

## 2. Cấu hình
Mở `server.js`, sửa 2 giá trị:
- `VERIFY_TOKEN`: chuỗi bất kỳ do bạn tự đặt (vd: `mybot123`)
- `PAGE_ACCESS_TOKEN`: token lấy từ Facebook App (Messenger → Settings → Access Tokens)

Nên đưa 2 giá trị này ra biến môi trường (.env) khi deploy thật, không hardcode trong code.

## 3. Chạy thử local
```bash
npm start
```
Server chạy ở `http://localhost:3000`.

Dùng [ngrok](https://ngrok.com/) để expose ra internet tạm thời:
```bash
ngrok http 3000
```
Copy URL https ngrok trả về, dùng làm Webhook URL khi test.

## 4. Deploy thật (khuyên dùng Render.com hoặc Railway.app — miễn phí, tự cấp HTTPS)
1. Đẩy code lên GitHub.
2. Trên Render/Railway: New Web Service → connect repo → deploy.
3. Thêm biến môi trường `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN`.
4. Lấy URL public (dạng `https://ten-app.onrender.com`), dùng làm Webhook URL: `https://ten-app.onrender.com/webhook`.

## 5. Cấu hình trên Facebook App
- Vào Messenger → Settings → Webhooks → Edit Callback URL
- Callback URL: `https://<domain-cua-ban>/webhook`
- Verify Token: giống hệt giá trị `VERIFY_TOKEN` trong code
- Subscribe fields: `messages`, `messaging_postbacks`
- Sau đó vào phần "Webhooks" của từng Page → Add Subscriptions

## 6. Tùy biến logic trả lời
Sửa hàm `handleMessage()` trong `server.js`. Có thể:
- Thêm nhiều rule từ khóa hơn
- Gọi sang một AI API (vd Anthropic/OpenAI) để trả lời thông minh hơn thay vì rule cứng
- Lưu lịch sử hội thoại vào database (MongoDB, PostgreSQL...) nếu cần ngữ cảnh nhiều lượt

## Lưu ý quan trọng
- Facebook giới hạn: chỉ được gửi tin nhắn chủ động (ngoài 24h) nếu dùng đúng "message tag" cho phép, tránh bị khóa app.
- Muốn bot chạy công khai cho mọi khách nhắn Page (không chỉ admin/tester), phải nộp App Review xin quyền `pages_messaging`.
- Không nên để lộ `PAGE_ACCESS_TOKEN` trong code public trên GitHub.
