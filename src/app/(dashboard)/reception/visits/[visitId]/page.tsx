import { notFound } from 'next/navigation';
import { visitsService } from '@/server/common/container';
import { VisitDetailView } from '@/features/reception/visits';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chi tiết lượt khám | DERMACARE',
  description: 'Thông tin chi tiết lượt khám tiếp nhận tại quầy lễ tân.',
};

interface VisitDetailPageProps {
  params: Promise<{ visitId: string }>;
}

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { visitId } = await params;

  try {
    const visit = await visitsService.getById(visitId);
    return (
      <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <VisitDetailView visit={visit} />
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}

