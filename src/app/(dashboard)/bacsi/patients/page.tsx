import { redirect } from 'next/navigation';
import { PatientRecordWorkspace } from '@/features/emr/components/PatientRecordWorkspace';
import { getDoctorPatientWorkspace } from '@/features/emr/patient-record-actions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ patientId?: string; visitId?: string }>;

export default async function DoctorPatientsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const result = await getDoctorPatientWorkspace(params.patientId);
  if (!result.success) redirect('/bacsi/dang-nhap');
  if (!result.data) {
    return <main className="space-y-4"><header><h1 className="text-2xl font-bold text-slate-900">Hồ sơ bệnh nhân / Bệnh án</h1><p className="mt-1 text-sm text-slate-500">Hồ sơ chỉ hiển thị bệnh nhân có lượt khám được phân công cho bác sĩ đang đăng nhập.</p></header><section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">Chưa có bệnh nhân được phân công trong tài khoản này.</section></main>;
  }
  const requestedVisit = params.visitId && result.data.visits.some((visit: { id: string }) => visit.id === params.visitId) ? params.visitId : result.selectedVisitId;

  return <PatientRecordWorkspace patients={result.patients} data={result.data} selectedVisitId={requestedVisit} />;
}
