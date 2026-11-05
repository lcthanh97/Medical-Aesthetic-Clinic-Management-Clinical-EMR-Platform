import { AppointmentsPanel } from '@/features/appointments/components/AppointmentsPanel';

export default async function CustomerAppointmentsPage() {
  return (
    <main className="p-4 sm:p-6 bg-gradient-to-b from-blue-50/50 via-gray-50/30 to-white min-h-[calc(100vh-120px)] rounded-2xl">
      <div className="max-w-3xl mx-auto mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 shadow-sm border border-blue-200/60 mb-2">
          👤 Phân hệ Khách hàng / Bệnh nhân
        </span>
      </div>
      <AppointmentsPanel />
    </main>
  );
}
