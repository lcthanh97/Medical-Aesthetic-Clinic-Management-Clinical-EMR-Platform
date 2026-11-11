import { WalkInVisitForm } from '@/features/reception/visits';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Đăng ký lượt khám tại quầy | Lễ tân EMR',
  description: 'Tiếp nhận bệnh nhân đến trực tiếp tại quầy và cấp số thứ tự khám.',
};

interface NewVisitPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function LetanNewVisitPage({ searchParams }: NewVisitPageProps) {
  const { patientId } = await searchParams;

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
          <span className="font-semibold text-[#20334b]">Tạo lượt khám mới</span>
        </div>

        <Link
          href="/letan/reception"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6c7e93] hover:text-[#20334b] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại danh sách tiếp đón</span>
        </Link>
      </div>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#e1e9f2] pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-[#edf5ff] text-[#246dce] text-[11px] font-semibold mb-2">
            <Users size={13} />
            <span>Phân hệ Lễ tân · Tiếp đón & Phân phòng</span>
          </div>
          <h1 className="text-[25px] font-bold text-[#20334b]">
            Đăng ký lượt khám trực tiếp (Walk-in)
          </h1>
          <p className="mt-1 text-[12px] text-[#6c7e93]">
            Tra cứu bệnh nhân hoặc tạo lượt khám mới, chọn phòng khám chuyên khoa và cấp số thứ tự
          </p>
        </div>
      </header>

      <div className="pt-1">
        <WalkInVisitForm initialPatientId={patientId} />
      </div>
    </main>
  );
}

