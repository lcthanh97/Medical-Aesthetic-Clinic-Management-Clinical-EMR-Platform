import { AdministrationPanel } from '@/features/administration';

export default function AdminAdministrationPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị Hệ thống
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Quản trị Phòng khám & Phân quyền</h1>
        <p className="text-sm text-gray-500">Cấu hình phòng khám, danh sách phòng chức năng, quản lý tài khoản bác sĩ và nhân viên</p>
      </div>
      <AdministrationPanel />
    </main>
  );
}
