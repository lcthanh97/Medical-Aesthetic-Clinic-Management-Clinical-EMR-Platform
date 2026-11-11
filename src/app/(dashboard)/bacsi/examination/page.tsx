import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { DoctorExaminationPanel } from '@/features/emr';
import { getAssignedVisitExamination } from '@/features/emr/actions';
import { getDoctorDashboard } from '@/features/appointments/actions';
import { isTreatmentImageStorageConfigured } from '@/server/services/TreatmentImageStorage';

type SearchParams = Promise<{ visitId?: string; date?: string }>;

export default async function DoctorExaminationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const queue = await getDoctorDashboard({ date: params.date });

  if (!queue.success) {
    const requiresLogin = queue.code === 'AUTH_REQUIRED';
    return (
      <main className="mx-auto w-full max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8" role="alert">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Khu vực bác sĩ</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Khám bệnh &amp; Chỉ định</h1>
        <p className="mt-2 text-sm leading-6 text-rose-700">{queue.error}</p>
        <Link href={requiresLogin ? '/admin/auth' : '/bacsi/queue'} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">{requiresLogin ? 'Đăng nhập' : 'Mở hàng đợi khám'} <ArrowRight size={16} /></Link>
      </main>
    );
  }

  const visits = queue.data.visits;
  const requestedId = params.visitId?.trim();
  const defaultVisit = visits.find((visit) => ['IN_PROGRESS', 'EXAMINING'].includes(visit.status)) ?? visits[0];
  const selectedId = requestedId || defaultVisit?.id;
  const result = selectedId ? await getAssignedVisitExamination(selectedId) : null;

  if (selectedId && result && !result.success) {
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

  const selectedVisit = result?.success ? result.data : null;
  const options = [...visits];
  if (selectedVisit && !options.some((visit) => visit.id === selectedVisit.id)) {
    options.unshift({
      id: selectedVisit.id,
      status: selectedVisit.status,
      visitDate: new Date(selectedVisit.visitDate),
      patient: selectedVisit.patient,
    } as (typeof visits)[number]);
  }

  return selectedVisit && result?.success ? (
        <DoctorExaminationPanel
          key={result.data.id}
          visit={result.data}
          visitOptions={options}
          selectedVisitId={selectedVisit.id}
          selectedDate={queue.selectedDate}
          canWrite={result.canWrite}
          canStartVisit={result.canStartVisit}
          canSupplementNotes={result.canSupplementNotes}
          writeBlockReason={result.writeBlockReason}
          canReadClinicalOrders={result.canReadClinicalOrders}
          canManageClinicalOrders={result.canManageClinicalOrders}
          clinicalImageStorageConfigured={isTreatmentImageStorageConfigured()}
          canReadPrescriptions={result.canReadPrescriptions}
        />
      ) : (
        <main className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e1e9f2] bg-white p-8 text-center shadow-sm">
          <Stethoscope className="mx-auto text-blue-600" size={28} />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Chưa có lượt khám được phân công trong ngày</h2>
          <p className="mt-2 text-sm text-slate-600">Hàng đợi chỉ hiển thị lượt khám thuộc bác sĩ đang đăng nhập.</p>
          <Link href={`/bacsi/queue?date=${encodeURIComponent(queue.selectedDate)}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#246dce] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Mở hàng đợi khám <ArrowRight size={16} /></Link>
        </main>
      );
}
