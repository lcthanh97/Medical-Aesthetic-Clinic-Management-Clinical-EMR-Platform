/**
 * Phòng khám hoạt động theo giờ Việt Nam. Vercel chạy server ở UTC, nên mọi chỗ dùng
 * toLocaleString()/setHours() phía server sẽ lệch 7 tiếng (giờ khám hiển thị sai,
 * ranh giới "hôm nay" của hàng đợi sai, HTML server khác trình duyệt → lỗi hydration #418).
 * Node.js áp dụng ngay khi gán process.env.TZ, nên đặt ở đây trước khi server nhận request.
 * Các đoạn code cố ý tính theo UTC (getUTC*, Date.UTC) không bị ảnh hưởng.
 */
const CLINIC_TIME_ZONE = 'Asia/Ho_Chi_Minh';

if (typeof process !== 'undefined' && process.env) process.env.TZ = CLINIC_TIME_ZONE;

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') process.env.TZ = CLINIC_TIME_ZONE;
}
