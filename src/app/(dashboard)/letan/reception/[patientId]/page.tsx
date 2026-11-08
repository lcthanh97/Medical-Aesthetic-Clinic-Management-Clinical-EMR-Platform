import { PatientDetailView } from '@/features/reception';
import { receptionService } from '@/server/common/container';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await props.params;
  try {
    const patient = await receptionService.getById(patientId);
    return {
      title: `${patient.fullName} (${patient.patientCode}) | Lễ tân EMR`,
      description: `Chi tiết hồ sơ bệnh nhân ${patient.fullName}`,
    };
  } catch {
    return {
      title: 'Hồ sơ bệnh nhân | Lễ tân EMR',
    };
  }
}

export default async function LetanPatientDetailPage(props: {
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
    <main className="max-w-[1180px] mx-auto text-[#20334b] space-y-5">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-[#6c7e93]">
          <Link href="/letan" className="hover:text-[#246dce] transition-colors">
            Lễ tân
          </Link>
          <span>/</span>
          <Link href="/letan/reception" className="hover:text-[#246dce] transition-colors">
            Tiếp đón bệnh nhân
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#20334b]">{patient.patientCode}</span>
        </div>

        <Link
          href="/letan/reception"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6c7e93] hover:text-[#20334b] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại danh sách</span>
        </Link>
      </div>

      <PatientDetailView patient={patient} />
    </main>
  );
}

