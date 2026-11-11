import Link from 'next/link';
import { EmrPanel } from '@/features/emr';
import { getPatients, getPatientFullEMR } from '@/features/emr/actions';

export default async function BacSiEmrPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const patientsResult = await getPatients();

  if (!patientsResult.success) {
    return (
      <main className="mx-auto max-w-3xl p-6" role="alert">
        <h1 className="text-xl font-bold text-slate-900">Không thể mở hồ sơ bệnh nhân</h1>
        <p className="mt-2 text-sm text-slate-600">{patientsResult.error}</p>
      </main>
    );
  }

  const patients = patientsResult.data ?? [];
  const targetPatientId = resolvedSearchParams.patientId || patients[0]?.id;
  let selectedPatient = null;

  if (targetPatientId) {
    const detailResult = await getPatientFullEMR(targetPatientId);
    if (detailResult.success) selectedPatient = detailResult.data;
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-2 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#235f9e]">Không gian bác sĩ</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20334b] sm:text-[27px]">Hồ sơ bệnh nhân / Bệnh án</h1>
          <p className="mt-1 text-sm text-[#6c7e93]">Thông tin và lịch sử khám trong các Visit được phân công.</p>
        </div>
        {selectedPatient?.visits?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedPatient.visits[0]?.id && (
              <Link href={`/bacsi/examination?visitId=${encodeURIComponent(selectedPatient.visits[0].id)}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#246dce] px-3.5 text-sm font-semibold text-white hover:bg-blue-700">
                Khám bệnh &amp; chỉ định
              </Link>
            )}
            {patientsResult.canReadImages && (<Link href={`/bacsi/images?patientId=${encodeURIComponent(selectedPatient.id)}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c8d7e8] bg-white px-3.5 text-sm font-semibold text-[#235f9e] hover:bg-blue-50">Ảnh theo dõi</Link>)}
            {patientsResult.canReadPrescriptions && (
              <Link href="/bacsi/prescriptions" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c8d7e8] bg-white px-3.5 text-sm font-semibold text-[#235f9e] hover:bg-blue-50">
                Kê đơn
              </Link>
            )}
          </div>
        )}
      </div>

      <EmrPanel
        initialPatients={JSON.parse(JSON.stringify(patients))}
        initialSelectedPatient={JSON.parse(JSON.stringify(selectedPatient))}
        canWrite={patientsResult.canWrite}
        canReadImages={patientsResult.canReadImages}
        canReadClinicalOrders={patientsResult.canReadImages}
        canReadPrescriptions={patientsResult.canReadPrescriptions}
        canReadTreatmentPlans={patientsResult.canReadTreatmentPlans}
      />
    </main>
  );
}
