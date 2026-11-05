import { PrescriptionsPanel } from '@/features/prescriptions';

export default async function BacSiPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string | string[] }>;
}) {
  const query = await searchParams;
  const visitId = typeof query.visitId === 'string' && query.visitId.length <= 100 ? query.visitId : undefined;

  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Kê đơn thuốc điện tử</h1>
        <p className="text-sm text-gray-500">Tra cứu danh mục thuốc và lưu đơn nháp cho lượt khám được phân công</p>
      </div>
      <PrescriptionsPanel initialVisitId={visitId} />
    </main>
  );
}
