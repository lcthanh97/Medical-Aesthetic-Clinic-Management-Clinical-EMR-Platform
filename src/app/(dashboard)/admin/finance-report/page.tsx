import { Suspense } from 'react';
import { FinanceReport } from '@/features/finance-report/FinanceReport';

export default function AdminFinanceReportPage() {
  return <main className="space-y-4 pb-8">
    <header>
      <span className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Phân hệ Quản trị &amp; Báo cáo</span>
      <h1 className="text-2xl font-bold text-gray-900">Báo cáo tài chính &amp; kho</h1>
      <p className="mt-1 text-sm text-gray-500">Đối chiếu hóa đơn, số tiền đã thu, tuổi nợ và cảnh báo tồn thấp.</p>
    </header>
    <Suspense fallback={<p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-600">Đang tải báo cáo…</p>}>
      <FinanceReport />
    </Suspense>
  </main>;
}
