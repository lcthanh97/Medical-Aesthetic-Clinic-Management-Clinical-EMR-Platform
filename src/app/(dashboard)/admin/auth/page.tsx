import { AuthPanel } from '@/features/auth';

export default function AdminAuthPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị Hệ thống
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Xác thực & Tài khoản</h1>
        <p className="text-sm text-gray-500">Đăng nhập, quản lý quyền hạn và bảo mật tài khoản người dùng</p>
      </div>
      <AuthPanel />
    </main>
  );
}
