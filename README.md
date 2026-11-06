# Hệ thống quản trị phòng khám da liễu & bệnh án điện tử

Bộ khung Next.js + TypeScript + PostgreSQL + Prisma theo Clean Architecture để nhóm chia module và triển khai TODO.

## Stack
Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod, Vitest.

## Architecture
Browser → Page/Feature → API Route → Controller → Service → Repository interface → Prisma repository → PostgreSQL.

## Liên kết bàn giao

- GitHub: https://github.com/lcthanh97/Medical-Aesthetic-Clinic-Management-Clinical-EMR-Platform
- Web production: https://dermatology-clinic-emr.vercel.app
- Health check: https://dermatology-clinic-emr.vercel.app/api/health

## Chạy dự án trực tiếp

Yêu cầu: Node.js 22+, npm, tài khoản Neon PostgreSQL và các biến môi trường trong `.env.example`.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Nếu dự án Neon đã có schema và dữ liệu mẫu, bỏ qua `prisma db seed`. Không commit file `.env` hoặc khóa thật.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
```

Xem [ARCHITECTURE.md](ARCHITECTURE.md), [TASK_ASSIGNMENT.md](TASK_ASSIGNMENT.md) và [CONTRIBUTING.md](CONTRIBUTING.md).

## Chạy bằng Docker Compose

Sao chép `.env.example` thành `.env`, điền chuỗi kết nối Neon và các khóa JWT tối thiểu 32 ký tự, sau đó chạy:

```bash
docker compose up --build -d
```

Mở http://localhost:3000. Kiểm tra trạng thái container và kết nối cơ sở dữ liệu:

```bash
docker compose ps
curl http://localhost:3000/api/health
```

Dừng hệ thống bằng `docker compose down`. Cơ sở dữ liệu PostgreSQL đặt trên Neon nên container không lưu bí mật hoặc dữ liệu bệnh án vào image.
