import { NotificationsPanel } from '@/features/notifications';

export default function AdminNotificationsPage() {
  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị Hệ thống
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Thông báo hệ thống</h1>
        <p className="text-sm text-gray-500">Gửi và theo dõi các thông báo nội bộ phòng khám và nhắc lịch khám</p>
      </div>
      <NotificationsPanel />
    </main>
  );
}
