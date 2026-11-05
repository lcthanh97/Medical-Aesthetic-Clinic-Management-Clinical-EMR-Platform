import { AppointmentsPanel } from '@/features/appointments/components/AppointmentsPanel';

export default async function CustomerAppointmentsPage() {
  return (
    <main className="min-h-[calc(100vh-90px)] rounded-2xl bg-[#f5f8fc] p-2 sm:p-4">
      <div className="max-w-3xl mx-auto mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1768d3]">Cổng khách hàng</p><h1 className="mt-1 text-3xl font-bold text-[#17324d]">Đặt lịch khám</h1><p className="mt-2 text-sm text-[#6c7e93]">Chọn dịch vụ, bác sĩ và khung giờ phù hợp với bạn.</p>
      </div>
      <AppointmentsPanel />
    </main>
  );
}
