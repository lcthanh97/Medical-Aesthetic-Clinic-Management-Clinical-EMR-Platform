# REST API — hợp đồng đã xác minh

## Trạng thái
Các route dưới đây là skeleton hiện có, chưa phải API nghiệp vụ hoạt động. Hợp đồng duy nhất có thể khẳng định từ code là method, path và HTTP 501 hiện tại. Chưa có payload, query, auth, error mapping hoặc status thành công được xác minh.

`ApiResponse<T>` được khai báo tại `src/types/api.ts`:

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; details?: unknown };
}
```

Helper `src/server/common/notImplemented.ts` trả JSON `{ success: false, message: "Not implemented: <module>" }` với HTTP 501. Cấu trúc này tương thích với một phần `ApiResponse<T>` (dùng `message`, không có `data`/`error`), nhưng các handlers không khai báo hoặc kiểm tra kiểu `ApiResponse<T>`. Vì vậy không thể kết luận toàn bộ API tuân theo type này. Server actions cũng không thuộc hợp đồng REST; một số đang trả lỗi ở dạng khác.

## Endpoint hiện có và HTTP 501

| Path | Method | Kết quả hiện tại | Bằng chứng |
|---|---|---:|---|
| `/api/administration` | GET, POST | 501 | `src/app/api/administration/route.ts` |
| `/api/appointments` | GET, POST | 501 | `src/app/api/appointments/route.ts` |
| `/api/audit` | GET, POST | 501 | `src/app/api/audit/route.ts` |
| `/api/auth` | GET, POST | 501 | `src/app/api/auth/route.ts` |
| `/api/billing` | GET, POST | 501 | `src/app/api/billing/route.ts` |
| `/api/clinical-services` | GET, POST | 501 | `src/app/api/clinical-services/route.ts` |
| `/api/consents` | GET, POST | 501 | `src/app/api/consents/route.ts` |
| `/api/emr` | GET, POST | 501 | `src/app/api/emr/route.ts` |
| `/api/inventory` | GET, POST | 501 | `src/app/api/inventory/route.ts` |
| `/api/notifications` | GET, POST | 501 | `src/app/api/notifications/route.ts` |
| `/api/prescriptions` | GET, POST | 501 | `src/app/api/prescriptions/route.ts` |
| `/api/reception` | GET, POST | 501 | `src/app/api/reception/route.ts` |
| `/api/reports` | GET, POST | 501 | `src/app/api/reports/route.ts` |
| `/api/treatments` | GET, POST | 501 | `src/app/api/treatments/route.ts` |

## Hợp đồng còn chờ xác minh/phê duyệt

| Hạng mục | Trạng thái | Owner/input cần thiết |
|---|---|---|
| Request/response schema theo use case, path parameters, filters, pagination | Chưa được khai báo ở route; không suy diễn từ server actions | Owner từng module; SYS-01 tổng hợp sau review |
| Authentication, resource/facility scope, role/permission và masking dữ liệu | Chưa hoạt động/xác minh; `AuthorizationService.can()` hiện luôn false | Auth/RBAC owner Trần Ngọc Chí Thành |
| Danh mục status HTTP và error codes nhất quán | Chưa có mapping ngoài 501 | SYS-01 đề xuất sau khi owners thống nhất |
| API versioning, idempotency, concurrency, audit semantics | Chưa có căn cứ trong route contract | Owner module/Audit |
| Hợp đồng kết quả cận lâm sàng, medication/prescription | Chưa đủ nghiệp vụ và schema/API | CLS owner; MED owner; bác sĩ/owner nghiệp vụ |
| OpenAPI/Swagger | Không thấy file trong cây đã rà soát | SYS-01 cùng các owner quyết định hình thức và thời điểm |

Không gọi các endpoint này như API đã khả dụng. Không coi bảng trên là đề xuất thêm endpoint; chỉ liệt kê route đang tồn tại.
