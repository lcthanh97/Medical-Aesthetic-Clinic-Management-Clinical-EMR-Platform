import { WalkInVisitForm } from '@/features/reception/visits';

export const metadata = {
  title: 'Đăng ký lượt khám tại quầy (REC-02) | DERMACARE',
  description: 'Tiếp nhận bệnh nhân đến trực tiếp tại quầy và cấp số thứ tự khám.',
};

interface NewVisitPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function NewVisitPage({ searchParams }: NewVisitPageProps) {
  const { patientId } = await searchParams;

  return (
    <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <WalkInVisitForm initialPatientId={patientId} />
      </div>
    </div>
  );
}

