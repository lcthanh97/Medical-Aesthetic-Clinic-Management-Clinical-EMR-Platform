import { AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getPatients } from '@/features/emr/actions';
import { TreatmentImageWorkspace } from '@/features/emr/components/TreatmentImageWorkspace';
import { getTreatmentImageWorkspace } from '@/features/emr/images/actions';
import { isTreatmentImageStorageConfigured } from '@/server/services/TreatmentImageStorage';

type Props = { searchParams: Promise<{ patientId?: string | string[] }> };

export default async function DoctorImagesPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedPatientId = typeof params.patientId === 'string' && params.patientId.length <= 100 ? params.patientId : '';
  const patientResult = await getPatients();

  if (!patientResult.success) {
    return <main role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">Không thể tải danh sách bệnh nhân được phân công.</p>
      <p className="mt-1">Cần phiên đăng nhập hợp lệ và quyền EMR_READ.</p>
    </main>;
  }

  const assignedPatients = patientResult.data ?? [];
  const selected = requestedPatientId
    ? assignedPatients.find((patient: { id: string }) => patient.id === requestedPatientId)
    : assignedPatients[0];
  const invalidPatient = Boolean(requestedPatientId && !selected);
  const patients = assignedPatients.map((patient: any) => ({
    id: patient.id,
    fullName: patient.fullName,
    patientCode: patient.patientCode,
    visits: (patient.visits ?? []).map((visit: any) => ({ id: visit.id, visitDate: visit.visitDate, status: visit.status })),
  }));
  const initialPatient = selected ? patients.find((patient: { id: string }) => patient.id === selected.id) : undefined;
  const canReadImages = Boolean(patientResult.canReadImages && initialPatient);
  const timelineResult = canReadImages && initialPatient
    ? await getTreatmentImageWorkspace(initialPatient.id)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-2 sm:p-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#235f9e]"><ImageIcon size={15} /> Không gian bác sĩ</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20334b] sm:text-[27px]">Ảnh theo dõi</h1>
          <p className="mt-1 text-sm text-[#6c7e93]">Timeline ảnh từ các Visit được phân công. Ảnh chỉ mở qua kho riêng tư sau khi kiểm tra quyền và phạm vi.</p>
        </div>
      </header>

      {invalidPatient && <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0" /> Bệnh nhân không nằm trong phạm vi Visit được phân công.</div>}
      {!patientResult.canReadImages ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Tài khoản chưa có quyền IMAGE_READ.</p>
          <p className="mt-1">Không tải metadata ảnh nếu tài khoản thiếu quyền.</p>
        </div>
      ) : !invalidPatient && (
        <TreatmentImageWorkspace
          patients={JSON.parse(JSON.stringify(patients))}
          initialPatientId={initialPatient?.id ?? ''}
          initialImages={timelineResult?.success ? JSON.parse(JSON.stringify(timelineResult.data)) : []}
          initialPermissions={timelineResult?.success ? timelineResult.permissions : undefined}
          initialError={timelineResult && !timelineResult.success ? timelineResult.message : ''}
          storageConfigured={isTreatmentImageStorageConfigured()}
          canReadImages={canReadImages}
        />
      )}
    </main>
  );
}
