# Hệ thống quản trị phòng khám da liễu & bệnh án điện tử

Bộ khung Next.js + TypeScript + PostgreSQL + Prisma theo Clean Architecture để nhóm chia module và triển khai TODO.

## Stack
Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod, Vitest.

## Architecture
Browser → Page/Feature → API Route → Controller → Service → Repository interface → Prisma repository → PostgreSQL.

## Chạy dự án

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
```

Xem [ARCHITECTURE.md](ARCHITECTURE.md), [TASK_ASSIGNMENT.md](TASK_ASSIGNMENT.md) và [CONTRIBUTING.md](CONTRIBUTING.md).
