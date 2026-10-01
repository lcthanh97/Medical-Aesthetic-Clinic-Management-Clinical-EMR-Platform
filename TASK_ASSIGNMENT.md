# Task Assignment

| Khối | Mã | Owner | Hỗ trợ | Branch | Phạm vi |
|---|---|---|---|---|---|
| Nền tảng, EMR, báo cáo, thông báo | SYS-01/03, EMR-01/02/03, CLS-03, INV-03, MED-01, NTF, RPT | Trần Trọng Duy | Theo từng task | feature/tran-trong-duy-emr-report-notification | emr, reports, notifications, prescription + architecture |
| Tiếp nhận, consent, billing | SYS-02, REC-01/02, CLS-04, CON-01/02, BIL-01/02, QA-02 | Nguyễn Nhật Đăng Khoa | Theo từng task | feature/nguyen-nhat-dang-khoa-reception-consent-billing | reception, appointments, consents, billing |
| Điều trị, kho, rule nghiệp vụ | REC-03/04, TRT-01..04, INV-01/02, QA-01 | Lưu Cơ Thành | Theo từng task | feature/luu-co-thanh-treatment-inventory-rules | treatments, inventory, clinical rules |
| Auth/RBAC, CLS, thiết bị, audit | SYS-04, EMR-04, CLS-01/02, INV-04, CON-03, ADM-01..03, AUD-01, QA-03 | Trần Ngọc Chí Thành | Theo từng task | feature/tran-ngoc-chi-thanh-auth-clinical-services-audit | auth, administration, clinical-services, audit |

## Quyền sửa folder
Owner được sửa `src/features/<module>`, page/API/module server tương ứng, module docs và tests. `prisma/schema.prisma`, `src/domain`, `src/components`, config và kiến trúc cần pull request có review của ít nhất một owner bị ảnh hưởng.

Nguồn phân công: workbook `PhanCong_ChucNang_DoAn_PhongKham_DaLieu.xlsx`.
