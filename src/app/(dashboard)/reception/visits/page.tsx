import { VisitsQueuePanel } from '@/features/reception/visits';

export const metadata = {
  title: 'Hàng đợi khám bệnh (REC-02) | DERMACARE',
  description: 'Theo dõi và quản lý bệnh nhân đang chờ tại các phòng khám da liễu thẩm mỹ.',
};

export default function ReceptionVisitsPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <VisitsQueuePanel />
      </div>
    </div>
  );
}

