import Link from 'next/link';
import { AppointmentsPanel } from '@/features/appointments/components/AppointmentsPanel';
import { CalendarDays, Users } from 'lucide-react';

export default function LetanAppointmentsPage() {
  return (
    <main className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            📋 Phân hệ Lễ tân
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý & Đặt lịch hẹn khám</h1>
          <p className="text-sm text-gray-500">Đặt lịch hẹn mới cho khách vãng lai (walk-in) hoặc qua hotline phòng khám</p>
        </div>
        <Link
          href="/letan/reception"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors self-start"
        >
          <Users size={16} />
          <span>Xem Danh sách tiếp đón</span>
        </Link>
      </div>

      <AppointmentsPanel />
    </main>
  );
}
