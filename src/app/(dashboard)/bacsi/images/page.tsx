import { AlertCircle, Image as ImageIcon } from 'lucide-react';
import { EmrPanel } from '@/features/emr';
import { getPatients, getTreatmentImageTimeline } from '@/features/emr/actions';

type Props = { searchParams: Promise<{ patientId?: string | string[] }> };

export default async function DoctorImagesPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedPatientId = typeof params.patientId === 'string' && params.patientId.length <= 100 ? params.patientId : '';
  const patientResult = await getPatients();

  if (!patientResult.success) {
    return <main role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p className="font-semibold">Không thể tải danh sách bệnh nhân được phân công.</p><p className="mt-1">Cần phiên hợp lệ và quyền EMR_READ.</p></main>;
  }

  const assignedPatients = patientResult.data ?? [];
  const selected = requestedPatientId
    ? assignedPatients.find((patient: { id: string }) => patient.id === requestedPatientId)
    : assignedPatients[0];
  const invalidPatient = Boolean(requestedPatientId && !selected);
  const imagePatients = assignedPatients.map((patient: any) => ({
    id: patient.id,
    fullName: patient.fullName,
    patientCode: patient.patientCode,
    visits: (patient.visits ?? []).map((visit: any) => ({ id: visit.id, visitDate: visit.visitDate, status: visit.status })),
  }));
  const initialSelected = selected ? imagePatients.find((patient: { id: string }) => patient.id === selected.id) : undefined;
  const timelineResult = patientResult.canReadImages && initialSelected
    ? await getTreatmentImageTimeline(initialSelected.id)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-2 sm:p-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#235f9e]"><ImageIcon size={15} /> Không gian bác sĩ</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20334b] sm:text-[27px]">Ảnh theo dõi</h1>
          <p className="mt-1 text-sm text-[#6c7e93]">Timeline và so sánh metadata ảnh trong các Visit được phân công. File ảnh chưa hiển thị vì storage riêng tư chưa được xác minh.</p>
        </div>
      </header>

      {invalidPatient && <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0" /> Bệnh nhân không nằm trong phạm vi Visit được phân công.</div>}
      {!patientResult.canReadImages ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Thiếu quyền IMAGE_READ.</p><p className="mt-1">Không có metadata ảnh nào được tải.</p></div>
      ) : !invalidPatient && (
        <EmrPanel
          initialPatients={JSON.parse(JSON.stringify(imagePatients))}
          initialSelectedPatient={JSON.parse(JSON.stringify(invalidPatient ? null : initialSelected ?? null))}
          canWrite={false}
          canReadImages
          canReadPrescriptions={false}
          canReadTreatmentPlans={false}
          imagesOnly
          initialActiveTab="images"
          initialTreatmentImages={timelineResult?.success ? JSON.parse(JSON.stringify(timelineResult.data)) : []}
          initialTreatmentImageError={timelineResult && !timelineResult.success ? timelineResult.error : ''}
        />
      )}
    </main>
  );
}
