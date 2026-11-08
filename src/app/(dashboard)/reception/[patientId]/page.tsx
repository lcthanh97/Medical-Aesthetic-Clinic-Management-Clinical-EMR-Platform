import Link from 'next/link';
import { notFound } from 'next/navigation';
import { receptionService } from '@/server/common/container';
import { PatientDetailView } from '@/features/reception';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await props.params;
  try {
    const patient = await receptionService.getById(patientId);
    return {
      title: `${patient.fullName} (${patient.patientCode}) | DERMACARE`,
      description: `Chi tiết hồ sơ bệnh nhân ${patient.fullName}`,
    };
  } catch {
    return {
      title: 'Hồ sơ bệnh nhân | DERMACARE',
    };
  }
}

export default async function PatientDetailPage(props: {
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/reception" className="hover:text-[#0e3a78]">
            Hồ sơ bệnh nhân
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#0e3a78]">{patient.patientCode}</span>
        </div>

        <PatientDetailView patient={patient} />
      </div>
    </div>
  );
}

