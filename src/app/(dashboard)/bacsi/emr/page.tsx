import { EmrPanel } from '@/features/emr';
import { getPatients, getPatientFullEMR } from '@/features/emr/actions';

export default async function BacSiEmrPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const patientsRes = await getPatients();
  const patients = (patientsRes.success && patientsRes.data ? patientsRes.data : []) as any[];

  let selectedPatient = null;
  const targetId = resolvedSearchParams.patientId || (patients.length > 0 ? patients[0].id : null);
  if (targetId) {
    const detailRes = await getPatientFullEMR(targetId);
    if (detailRes.success && detailRes.data) {
      selectedPatient = detailRes.data;
    }
  }

  return (
    <main className="p-2 sm:p-4 max-w-[1600px] mx-auto space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ bệnh án điện tử (EMR)</h1>
        <p className="text-sm text-gray-500">Tra cứu tiền sử bệnh, chẩn đoán xác định, theo dõi tiến trình khám và hồ sơ bệnh án da liễu</p>
      </div>

      <EmrPanel 
        initialPatients={JSON.parse(JSON.stringify(patients))} 
        initialSelectedPatient={JSON.parse(JSON.stringify(selectedPatient))} 
      />
    </main>
  );
}
