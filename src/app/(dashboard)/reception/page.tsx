import { ReceptionPanel } from '@/features/reception';

export const metadata = {
  title: 'Hồ sơ bệnh nhân & Tiếp nhận | DERMACARE',
  description: 'Quản lý, tra cứu và tiếp nhận hồ sơ bệnh nhân tại phòng khám da liễu thẩm mỹ.',
};

export default function ReceptionPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fd] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ReceptionPanel />
      </div>
    </div>
  );
}
