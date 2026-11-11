# Giai đoạn 4A — SYS-01/SYS-03 và kế hoạch các nhóm chức năng

Ngày kiểm kê: 2026-11-04. Phạm vi hiện tại: phân tích và tài liệu; không thay đổi backend, frontend, schema, Auth/RBAC hoặc database.

## SYS-01 — đặc tả yêu cầu dựa trên bằng chứng

Phạm vi owner Trần Trọng Duy theo `TASK_ASSIGNMENT.md`: SYS-01/03, EMR-01/02/03, CLS-03, INV-03, MED-01. Tài liệu module hiện tại (`docs/modules/*.md`) phần lớn vẫn là TODO, nên chưa đủ để làm đặc tả nghiệp vụ chuẩn. Bằng chứng khả dụng hiện gồm cây source, Prisma schema, service/repository interfaces và server actions. Các dữ liệu này cho biết code đang có gì, không thay thế yêu cầu/duyệt nghiệp vụ.

Đặc tả API đã xác minh được ghi tại `docs/api/README.md`; mô hình mục tiêu và luồng thực tế được phân biệt tại `ARCHITECTURE.md`.

## SYS-03 — kiến trúc, API, controller, service, repository

- REST entry points: 14 route modules, `GET` + `POST`, tất cả 501; xem danh sách trong `docs/api/README.md`.
- Controllers: khung TODO tại `src/server/controllers/*Controller.ts`; chưa được route gọi.
- Services/repositories: có interfaces và một số implementation; mức độ khác nhau. Ví dụ `EmrService` có delegations/validation cơ bản; `PrescriptionsService` còn TODO nghiệp vụ; `InventoryService` delegate thao tác; `ReportsService` delegate một report.
- Infrastructure: các Prisma repositories nằm dưới `src/infrastructure/database/repositories`.
- Frontend: Next.js pages/features có sẵn; một số server actions kết nối trực tiếp service/repository hoặc Prisma, không qua REST/controller.
- `ApiResponse<T>`: khai báo tại `src/types/api.ts`; 501 helper trả subset `{success:false,message}`. Không có bằng chứng route áp dụng type thống nhất.

## Kế hoạch kỹ thuật cho 5 nhóm tính năng

Kế hoạch này ghi nhận hiện trạng và điều kiện để lập thiết kế chi tiết; không tự tạo endpoint, schema, quyền hay quy tắc nghiệp vụ. Mọi quyền đề cập là điểm phải xác minh, không phải quyền đã được phê duyệt.

### 1. EMR-01 / EMR-02 / EMR-03 — khám, bệnh án, timeline ảnh soi da

- **Hiện có:** `src/features/emr/actions.ts`, `src/features/emr/components/EmrPanel.tsx`, page dưới `src/app/(dashboard)/emr`; `EmrService`, `IEmrService`, `IEmrRepository`, `PrismaEmrRepository`; schema `Patient`, `Visit`, `MedicalRecord`, `Allergy`, `MedicalHistory`, `TreatmentImage`, `TreatmentPlan`, `TreatmentSession` (`prisma/schema.prisma`). MedicalRecord hiện chỉ có visit, preliminaryDiagnosis, finalDiagnosis, notes; TreatmentImage có URL, imageType, phase, bodyArea, description, capturedAt/capturedBy.
- **Cần bổ sung sau duyệt:** đối chiếu trường UI với schema; chốt nội dung khám lâm sàng cần ghi nhận và luồng lưu; hoàn thiện hợp đồng upload/storage và hiển thị ảnh; thống nhất timeline/sắp xếp và patient/visit scope; gắn API nếu owner chọn REST. Không bổ sung trường/logic trong giai đoạn này.
- **API/service/repository:** REST `/api/emr` hiện 501; service có get/list/full EMR, patient create/update, saveMedicalRecord, allergy/history, quick visit; Prisma repo là persistence đang dùng từ actions. Cần chốt use case, payload, transaction, error mapping trước khi nối REST.
- **Quyền:** dữ liệu sức khỏe cá nhân; cần Auth/RBAC owner định nghĩa quyền xem/sửa theo patient, visit, cơ sở/phòng và cách audit/masking. Hiện policy authorization chưa hoạt động.
- **Phụ thuộc:** Auth/RBAC + Audit (Trần Ngọc Chí Thành); tiếp nhận/Visit owner Nguyễn Nhật Đăng Khoa; treatment images/protocol owner Lưu Cơ Thành; storage/ảnh cần owner hạ tầng nếu có.
- **Thiếu dữ liệu nghiệp vụ:** mẫu khám được phê duyệt; trường bắt buộc; trạng thái/khóa sửa bệnh án; loại/pha ảnh và tiêu chí so sánh; nguồn storage, retention, consent; clinical vocabularies. Yêu cầu owner/bác sĩ cung cấp.
- **Kiểm thử/nghiệm thu đề xuất:** quyền chặn truy cập chéo patient/facility; round-trip record; validation theo mẫu đã duyệt; ảnh liên kết đúng patient/visit và metadata; audit; không rò dữ liệu nhạy cảm. Cần test fixture giả lập được duyệt, không dùng bệnh nhân thật.

### 2. CLS-03 — kết quả hình ảnh cận lâm sàng

- **Hiện có:** schema `ClinicalOrder` có liên kết `imagingResults`; `ImagingResult` có `conclusion`; EMR panel đọc `imagingResults` nhưng hiển thị `findings` với fallback text (tham chiếu `src/features/emr/components/EmrPanel.tsx`). `ClinicalServicePaymentPolicy` và module clinical services tồn tại ở mức implementation cần owner review; REST `/api/clinical-services` 501.
- **Cần bổ sung sau duyệt:** mapping `conclusion`/UI `findings`; xác định ai nhập/duyệt kết quả, nguồn ảnh/tệp và trạng thái; hợp đồng API theo workflow owner CLS. Không tự thêm cột hoặc dùng fallback text làm kết quả thật.
- **API/service/repository:** `ClinicalServicesController/Service/Repository` hiện có nhưng route không wiring; Prisma repository và model phải kiểm tra theo CLS owner. EMR display integration cần thống nhất contract.
- **Quyền:** xem theo patient/visit; tạo/sửa/duyệt theo vai trò chuyên môn và cơ sở; mọi quyền cần CLS/Auth owner phê duyệt.
- **Phụ thuộc:** CLS-01/02 + Auth/RBAC (Trần Ngọc Chí Thành), Billing/visit owner Nguyễn Nhật Đăng Khoa, EMR owner; payment policy cần chủ sở hữu xác nhận.
- **Thiếu dữ liệu:** mẫu kết quả, taxonomy modality, required fields, trạng thái ký/duyệt, file/retention, quy trình sửa và giao tiếp thiết bị. Cần owner CLS/bác sĩ cung cấp.
- **Kiểm thử/nghiệm thu:** mapping dữ liệu chính xác, trạng thái và permissions; kết quả của visit khác không lộ; file được bảo vệ; UI không hiển thị dữ liệu giả/fallback như kết quả; audit các sửa đổi.

### 3. INV-03 — định mức và giá vốn điều trị

- **Hiện có:** schema `TreatmentStep`, `ProtocolStepMaterial`, `TreatmentConsumption`, `InventoryTransaction`, `Supply`, `Medicine`; repository/service/action của inventory; luồng treatment deduce inventory tồn tại ở module Lưu Cơ Thành.
- **Cần bổ sung sau duyệt:** xác minh định mức theo step/session, đơn vị quy đổi, nguồn giá và thời điểm chốt giá, xử lý hao hụt/điều chỉnh/hoàn kho; phân định INV-03 với INV-01/02. Chưa xác nhận công thức tính giá vốn; không suy ra công thức từ trường totalCost hoặc implementation hiện tại.
- **API/service/repository:** `InventoryService` delegate đến `IInventoryRepository`; `deductInventoryForTreatment` có input/results typed nhưng chưa phê duyệt làm contract INV-03; route inventory 501. Trước integrate, review `PrismaInventoryRepository`/treatment owner.
- **Quyền:** đọc giá vốn theo vai trò; sửa định mức theo người được giao; duyệt/điều chỉnh và audit cần owner Auth/Audit + Inventory thống nhất.
- **Phụ thuộc:** INV-01/02 + treatment session/step (Lưu Cơ Thành), Auth/RBAC/Audit (Trần Ngọc Chí Thành), schema owner cross-review.
- **Thiếu dữ liệu:** đơn vị chuẩn/quy đổi, phương pháp định giá (FIFO/average/fixed hay khác), thời điểm snapshot, thuế/hao hụt, phiên bản định mức, xử lý trả/void. Owner nghiệp vụ/kế toán cung cấp.
- **Kiểm thử/nghiệm thu:** tính toán trên bộ ca biên do owner cung cấp; transaction/rollback tồn kho; không âm kho theo policy đã duyệt; snapshot giá truy vết; phân quyền và audit. Chưa chạy vì công thức chưa có.

### 4. MED-01 — kê đơn thuốc

- **Hiện có:** schema `Prescription`, `PrescriptionItem`, `Medicine`, `MedicineIngredient`, `InteractionAlert`; page/features prescriptions; `PrescriptionsService` chỉ list/get và TODO; repository interface có CRUD signatures; REST `/api/prescriptions` 501. Treatment action có tra tương tác thuốc (`src/features/treatments/actions.ts`), thuộc luồng treatment và cần owner review.
- **Cần bổ sung sau duyệt:** workflow kê/lưu/ký/hủy/sửa, liều dùng/cách dùng/thời hạn, liên kết chẩn đoán/visit, kiểm tra tương tác/chống chỉ định, in/export, kiểm kê/dispense nếu có. Không tự đặt liều hoặc quy tắc y khoa.
- **API/service/repository:** `PrescriptionsController/Service/IPrescriptionsRepository` và `PrismaPrescriptionsRepository` hiện có; Prisma repository chỉ trả null/list rỗng cho read và throw `Not implemented` cho create/update. Route hiện 501. Dùng danh mục Medicine hiện hữu nếu owner xác nhận dữ liệu/fields.
- **Quyền:** kê đơn/ký bởi nhóm chuyên môn được phê duyệt; đọc theo patient/visit scope; sửa/hủy có audit. Auth/RBAC owner phải định nghĩa.
- **Phụ thuộc:** Auth/RBAC/Audit (Trần Ngọc Chí Thành), catalog/tương tác thuốc và treatment owner Lưu Cơ Thành, EMR/Visit owner, bác sĩ phụ trách quy trình.
- **Thiếu dữ liệu:** danh mục thuốc hợp lệ, dạng/hàm lượng/đơn vị, hướng dẫn kê đơn, liều và tần suất, thời gian, cảnh báo dị ứng/tương tác, trạng thái chữ ký, quy tắc hủy/điều chỉnh. Owner y khoa cung cấp.
- **Kiểm thử/nghiệm thu:** validation theo hướng dẫn được duyệt; kiểm soát kê sai visit/thuốc; RBAC, audit; phản hồi tương tác; vòng đời đơn; dữ liệu giả đã được duyệt. Không kiểm thử liều y khoa tự tạo.

## Neon, migration và Git — trạng thái

- Không kết nối/ghi dữ liệu Neon trong giai đoạn tài liệu này. User yêu cầu chờ development branch được xác minh. `DATABASE_URL` có endpoint Neon nhưng từ chuỗi hiện có không thể xác minh dev/production; không in hoặc chia sẻ connection string.
- Kiểm tra trước đó cho thấy migration ledger Neon có 4 migrations: `20261001000000_init_clinic`, `20261006000000_complete_clinic_modules`, `20261006010000_treatment_schema_redesign`, `20261006011000_align_treatment_schema`. Cây migrations trong mã nguồn tại thời điểm đối chiếu chỉ có `20261001000000_init_clinic`; ba migration có trong ledger nhưng thiếu trong cây mã nguồn là `20261006000000_complete_clinic_modules`, `20261006010000_treatment_schema_redesign`, `20261006011000_align_treatment_schema`. Đây là chênh lệch hiện vật đã kiểm tra trước đó, không phải đề xuất tạo/chạy migration. Cần xác minh lại trên development branch đã được user xác nhận trước mọi thao tác DB. Không tự tạo hoặc áp dụng migration.
- Đang ở nhánh đích `feature/tran-trong-duy-emr-report-notification`; remote origin là repository đã chỉ định. Working tree ban đầu chứa snapshot ZIP Lưu Cơ Thành chưa commit/stage; các file đó được giữ nguyên. SYS-01/SYS-03 chỉ sửa tài liệu trong phạm vi được duyệt. Không stage/commit/push.

## Thông tin cần bổ sung trước khi triển khai nhóm sau

1. Neon development branch/endpoint đã xác minh (không gửi secret): tên branch và xác nhận không production; người quản trị xác nhận endpoint.
2. Tài liệu nghiệp vụ đã duyệt cho khám/bệnh án/ảnh, CLS result, định mức/giá vốn, kê đơn.
3. Owner xác nhận quyền/resource scope, audit và dữ liệu nhạy cảm.
4. Danh mục chuẩn và mẫu dữ liệu test giả lập đã duyệt; không dùng dữ liệu bệnh nhân thật.
5. Chủ sở hữu storage/retention ảnh và kết quả CLS nếu có file.
6. Review chéo từ các owner nêu theo từng tính năng, đặc biệt nếu cần thay Prisma schema, shared domain hoặc module của họ.

## Trình tự đề xuất sau phê duyệt tài liệu

1. EMR-01/02: chốt form/record mapping và read/write trên model hiện có, chỉ triển khai phần đã đủ nghiệp vụ + quyền; schema/storage-dependent work chờ owner input.
2. EMR-03: tiếp tục sau khi owner xác nhận lưu trữ, metadata, consent và timeline; ảnh y tế nhạy cảm nên không tự giả định URL công khai.
3. CLS-03: chờ CLS/Billing owner phê duyệt result workflow và mapping `conclusion`/UI.
4. INV-03: chờ công thức giá vốn, unit conversion và snapshot policy được duyệt.
5. MED-01: chờ hướng dẫn kê đơn và Auth/RBAC; không phát sinh liều/dữ liệu y khoa mặc định.

Mỗi nhóm phải được triển khai/test riêng, báo cáo PASS/FAIL/BLOCKED/NOT_TESTED, và dừng chờ duyệt trước nhóm kế tiếp.
