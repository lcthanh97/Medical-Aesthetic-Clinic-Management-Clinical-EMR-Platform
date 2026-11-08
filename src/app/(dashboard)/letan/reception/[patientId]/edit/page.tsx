import Link from 'next/link';
import { notFound } from 'next/navigation';
import { receptionService } from '@/server/common/container';
import { PatientForm } from '@/features/reception';
import { ArrowLeft, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await props.params;
  try {
    const patient = await receptionService.getById(patientId);
    return {
      title: `Chỉnh sửa: ${patient.fullName} | Lễ tân EMR`,
    };
  } catch {
    return {
      title: 'Chỉnh sửa hồ sơ bệnh nhân | Lễ tân EMR',
    };
  }
}

export default async function LetanEditPatientPage(props: {
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
          <Link href={`/letan/reception/${patient.id}`} className="hover:text-[#246dce] transition-colors">
            {patient.patientCode}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#20334b]">Chỉnh sửa</span>
        </div>

        <Link
          href={`/letan/reception/${patient.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6c7e93] hover:text-[#20334b] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại chi tiết</span>
        </Link>
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#e1e9f2] pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-[#edf5ff] text-[#246dce] text-[11px] font-semibold mb-2">
            <Users size={13} />
            <span>Hồ sơ: {patient.patientCode}</span>
          </div>
          <h1 className="text-[25px] font-bold text-[#20334b]">
            Cập nhật hồ sơ bệnh nhân
          </h1>
          <p className="mt-1 text-[12px] text-[#6c7e93]">
            Chỉnh sửa thông tin hành chính, danh mục cảnh báo dị ứng và tiền sử y khoa
          </p>
        </div>
      </header>

      <div className="pt-1">
        <PatientForm initialData={patient} isEdit={true} />
      </div>
    </main>
  );
}

