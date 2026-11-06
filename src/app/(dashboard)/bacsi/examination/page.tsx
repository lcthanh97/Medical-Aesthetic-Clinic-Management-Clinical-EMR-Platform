import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { DoctorExaminationPanel } from '@/features/emr';
import { getAssignedVisitExamination } from '@/features/emr/actions';

type SearchParams = Promise<{ visitId?: string }>;

export default async function DoctorExaminationPage({ searchParams }: { searchParams: SearchParams }) {
  const { visitId } = await searchParams;
  if (!visitId?.trim()) {
    return (
      <main className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e1e9f2] bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Khu vực bác sĩ</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Khám bệnh &amp; Chỉ định</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Chọn lượt khám được phân công từ hàng đợi để mở bệnh án. Trang không nhận patientId hoặc actorId làm căn cứ phân quyền.</p>
        <Link href="/bacsi/queue" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#246dce] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Mở hàng đợi khám <ArrowRight size={16} /></Link>
      </main>
    );
  }

  const result = await getAssignedVisitExamination(visitId);
  if (!result.success) {
    const requiresLogin = 'code' in result && result.code === 'AUTH_REQUIRED';
    return (
      <main className="mx-auto w-full max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8" role="alert">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Khu vực bác sĩ</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Khám bệnh &amp; Chỉ định</h1>
        <p className="mt-2 text-sm leading-6 text-rose-700">{result.error}</p>
        <Link href={requiresLogin ? '/admin/auth' : '/bacsi/queue'} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">{requiresLogin ? 'Đăng nhập' : 'Quay lại hàng đợi khám'} <ArrowRight size={16} /></Link>
      </main>
    );
  }

  return <DoctorExaminationPanel
    key={result.data.id}
    visit={result.data}
    canWrite={result.canWrite}
    writeBlockReason={result.writeBlockReason}
    canReadClinicalOrders={result.canReadClinicalOrders}
    canReadPrescriptions={result.canReadPrescriptions}
  />;
}
