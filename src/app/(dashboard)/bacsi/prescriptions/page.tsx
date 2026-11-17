import { PrescriptionsPanel } from '@/features/prescriptions';

export const dynamic = 'force-dynamic';

export default async function BacSiPrescriptionsPage({ searchParams }: { searchParams: Promise<{ visitId?: string }> }) {
  const params = await searchParams;
  return <main className="mx-auto max-w-[1440px] space-y-4 pb-8">
    <header><span className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Phân hệ Bác sĩ Điều trị</span><h1 className="text-2xl font-bold text-slate-900">Kê đơn thuốc</h1><p className="mt-1 text-sm text-slate-500">Lập đơn theo lượt khám được phân công và rà soát cảnh báo an toàn.</p></header>
    <PrescriptionsPanel initialVisitId={params.visitId ?? ''} />
  </main>;
}
