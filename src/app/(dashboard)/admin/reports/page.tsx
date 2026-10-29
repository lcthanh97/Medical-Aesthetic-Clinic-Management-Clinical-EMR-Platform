import { ReportsPanel } from '@/features/reports/components/ReportsPanel';
import { getInventoryAndRevenueReport } from '@/features/reports/actions';

export default async function AdminReportsPage() {
  const startDate = new Date();
  startDate.setDate(1); // Start of month
  const endDate = new Date(); // Today

  const result = await getInventoryAndRevenueReport(startDate, endDate);
  const reportData = result.success ? result.data : null;

  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị & Báo cáo
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Phân tích số liệu</h1>
        <p className="text-sm text-gray-500">Thống kê doanh thu, lưu lượng bệnh nhân, hiệu suất sử dụng thiết bị và tiêu hao vật tư</p>
      </div>
      <ReportsPanel reportData={reportData} />
    </main>
  );
}
