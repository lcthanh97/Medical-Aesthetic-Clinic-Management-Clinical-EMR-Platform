import { ReportsPanel } from '@/features/reports/components/ReportsPanel';

export default async function AdminReportsPage() {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);

  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị & Báo cáo
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Phân tích số liệu</h1>
        <p className="text-sm text-gray-500">Thống kê lượt khám, lịch hẹn được phân công và các chỉ số tài chính/tiêu hao khi được cấp quyền</p>
      </div>
      <ReportsPanel initialFilters={{ startDate, endDate }} />
    </main>
  );
}
