# Architecture

## Luồng phụ thuộc

Browser → Next.js Page → Feature Component → API Client → Route Handler → Controller → Service → Repository Interface ← Prisma Repository → PostgreSQL.

Domain không import React, Next.js hoặc Prisma. Infrastructure implement interface của application. Route chỉ chuyển giao request; service sở hữu use case; repository cô lập persistence.

## Quy tắc nghiệp vụ xuyên module
- Quyền được kiểm tra theo resource/cơ sở/phòng, không chỉ role toàn cục.
- Cận lâm sàng chỉ thực hiện sau xác nhận thanh toán.
- Bản cam kết đã ký là bất biến và có audit.
- Hoàn tất điều trị mới phát sinh trừ kho.
- Mọi thay đổi dữ liệu nhạy cảm ghi AuditLog.

## Module boundaries
Mỗi module chỉ sửa feature/page/API/server/test tương ứng; thay đổi shared/domain/schema phải được review chéo.
