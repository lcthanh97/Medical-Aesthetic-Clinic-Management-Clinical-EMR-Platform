import Link from 'next/link';
import { AppointmentsPanel } from '@/features/appointments/components/AppointmentsPanel';
import { CalendarDays, Users } from 'lucide-react';

export default function LetanAppointmentsPage() {
  return (
    <main className="space-y-5 max-w-[1180px] mx-auto text-[#20334b]">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#e1e9f2] pb-3">
        <div>
          <h1 className="text-[25px] font-bold text-[#20334b]">Quản lý & Đặt lịch hẹn khám</h1>
          <p className="mt-1 text-[12px] text-[#6c7e93]">
            Đặt lịch hẹn mới cho khách vãng lai (walk-in) hoặc qua hotline phòng khám
          </p>
        </div>
        <Link
          href="/letan/reception"
          className="inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#246dce] hover:bg-[#1f5cb0] px-4 text-[12px] font-semibold text-white shadow-xs transition-colors self-start sm:self-auto"
        >
          <Users size={15} />
          <span>Xem Danh sách tiếp đón</span>
        </Link>
      </header>

      <AppointmentsPanel />
    </main>
  );
}
