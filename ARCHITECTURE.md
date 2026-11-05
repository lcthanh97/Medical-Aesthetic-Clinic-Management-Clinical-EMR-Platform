# Kiến trúc hệ thống

## Mục đích và phạm vi
Tài liệu này ghi lại kiến trúc mục tiêu trong mã nguồn và phân biệt với luồng đang được triển khai. Đây không phải xác nhận thiết kế đã được owner các module phê duyệt.

## Mô hình 3 lớp mục tiêu

```text
Presentation (Next.js pages/features/API clients)
                  ↓
Application (route/controller → service/use case → repository interface)
                  ↓
Infrastructure (Prisma repository → PostgreSQL)
```

- **Presentation:** Next.js App Router trong `src/app`, giao diện và actions trong `src/features`, kiểu API dùng chung tại `src/types/api.ts`.
- **Application:** route handlers tại `src/app/api`, controller, service, validator, mapper và repository interface tại `src/server`.
- **Infrastructure:** hiện thực repository dùng Prisma trong `src/infrastructure/database/repositories`, Prisma Client và PostgreSQL.
- **Domain:** các quy tắc domain nằm rải rác trong service/policy/schema; tính độc lập hoàn toàn của domain so với Next.js/Prisma chưa được chứng minh. Cần rà soát cùng owner trước khi coi đây là ranh giới đã thực thi.

## Luồng thực tế đã xác minh

1. Có 14 route handlers trong `src/app/api/*/route.ts`; mỗi route hiện chỉ xuất `GET` và `POST`, gọi `notImplemented(...)`, trả HTTP 501.
2. Controller trong `src/server/controllers` hiện là khung, comment TODO yêu cầu validate request, gọi service và map HTTP response. Chưa thấy route nối controller.
3. Một số service và Prisma repositories có implementation. Mức độ hoàn chỉnh khác nhau theo module; xem `docs/analysis/phase-4a-sys01-sys03.md`.
4. Một số server actions ở `src/features/*/actions.ts` gọi service/repository hoặc Prisma trực tiếp. Ví dụ `src/features/emr/actions.ts`, `src/features/inventory/actions.ts`, `src/features/reports/actions.ts`. Các luồng này bỏ qua REST route/controller; không thể coi sơ đồ mục tiêu là đường đi chung cho mọi request.
5. Có repository interfaces, nhưng các API contract type hiện chưa gắn vào route handler. Không tìm thấy đặc tả OpenAPI/Swagger trong cây dự án được rà soát.

## Nguyên tắc cần owner xác nhận

- Quyền được kiểm tra theo resource/cơ sở/phòng; hiện `src/server/policies/AuthorizationService.ts` trả `false` cố định với TODO. Chưa thể xác nhận một endpoint có phân quyền hoạt động.
- `src/server/policies/ClinicalServicePaymentPolicy.ts` là policy riêng; quy tắc cận lâm sàng chỉ thực hiện sau xác nhận thanh toán cần owner CLS/Billing xác nhận.
- Bản cam kết đã ký bất biến và có audit; cần owner Consent/Audit xác nhận cơ chế lưu và audit.
- Hoàn tất điều trị phát sinh trừ kho; luồng hiện có trong treatment/inventory cần owner Lưu Cơ Thành xác nhận trước khi dùng làm hợp đồng liên module.
- Các thay đổi dữ liệu nhạy cảm cần audit; chưa xác minh cơ chế áp dụng toàn hệ thống.

## Quyền sửa và review
`TASK_ASSIGNMENT.md` quy định thay đổi shared/domain/schema, config và kiến trúc cần review chéo bởi ít nhất một owner bị ảnh hưởng. Tài liệu mô tả luồng của Auth/RBAC, consent, billing, clinical services hoặc inventory ở đây chỉ là quan sát/điểm cần xác nhận; không thay đổi hoặc phê duyệt thay owner.
