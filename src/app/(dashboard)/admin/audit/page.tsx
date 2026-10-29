import { AuditPanel } from '@/features/audit';

export default function AdminAuditPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị Hệ thống
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động (Audit Logs)</h1>
        <p className="text-sm text-gray-500">Truy vết mọi thao tác thêm, sửa, xóa hồ sơ bệnh nhân, lượt khám và đơn thuốc</p>
      </div>
      <AuditPanel />
    </main>
  );
}
