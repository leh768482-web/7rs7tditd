# VNM Classroom Life Sim

Mô phỏng trường học 2D nhìn từ trên cao, chạy bằng HTML Canvas và Node.js.

## Chạy trên Render
- Tạo Web Service từ repo GitHub chứa các file này.
- Runtime: Node.
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path (nếu có): `/health`

## Chạy thử trên máy có Node.js
```bash
npm install
npm start
```
Mở `http://localhost:3000`.

## Có gì trong bản này
- Chuyển cảnh tự động giữa lớp học và sân trường theo giờ học.
- Đồng hồ mô phỏng, tốc độ 1x/3x/10x và tạm dừng.
- Học sinh có đầu, thân, tay, chân; đi lại và đổi hoạt động.
- Tính cách và hành vi tùy chỉnh riêng từng học sinh/cô giáo.
- Có thể thêm mốc thời khóa biểu và chọn cảnh thủ công.

Đây là mô phỏng hành vi bằng luật và xác suất đơn giản, không phải mô hình AI thật hay bản sao hoàn toàn chính xác của hành vi ngoài đời.
