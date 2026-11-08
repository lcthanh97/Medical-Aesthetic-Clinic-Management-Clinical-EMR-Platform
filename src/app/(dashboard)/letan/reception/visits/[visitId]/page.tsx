import { VisitDetailView } from '@/features/reception/visits';
import { visitsService } from '@/server/common/container';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chi tiết lượt khám | Lễ tân EMR',
  description: 'Thông tin chi tiết lượt khám tiếp nhận tại quầy lễ tân.',
};

interface VisitDetailPageProps {
  params: Promise<{ visitId: string }>;
}

export default async function LetanVisitDetailPage({ params }: VisitDetailPageProps) {
  const { visitId } = await params;

  try {
    const visit = await visitsService.getById(visitId);
    return (
      <main className="max-w-[1180px] mx-auto text-[#20334b] space-y-5">
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
            <span className="font-semibold text-[#20334b]">Lượt khám #{visit.queueNumber}</span>
          </div>

          <Link
            href="/letan/reception"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6c7e93] hover:text-[#20334b] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Quay lại tiếp đón</span>
          </Link>
        </div>

        <VisitDetailView visit={visit} />
      </main>
    );
  } catch {
    notFound();
  }
}

