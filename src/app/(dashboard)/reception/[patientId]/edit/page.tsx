import Link from 'next/link';
import { notFound } from 'next/navigation';
import { receptionService } from '@/server/common/container';
import { PatientForm } from '@/features/reception';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await props.params;
  try {
    const patient = await receptionService.getById(patientId);
    return {
      title: `Chỉnh sửa: ${patient.fullName} | DERMACARE`,
    };
  } catch {
    return {
      title: 'Chỉnh sửa hồ sơ bệnh nhân | DERMACARE',
    };
  }
}

export default async function EditPatientPage(props: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await props.params;

  let patient = null;
  try {
    patient = await receptionService.getById(patientId);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/reception" className="hover:text-[#0e3a78]">
            Hồ sơ bệnh nhân
          </Link>
          <span>/</span>
          <Link href={`/reception/${patient.id}`} className="hover:text-[#0e3a78]">
            {patient.patientCode}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#0e3a78]">Chỉnh sửa</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e3a78] tracking-tight">
            Chỉnh sửa hồ sơ bệnh nhân
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật thông tin hành chính, bổ sung hoặc điều chỉnh cảnh báo dị ứng và tiền sử y khoa.
          </p>
        </div>

        <PatientForm initialData={patient} isEdit={true} />
      </div>
    </div>
  );
}

