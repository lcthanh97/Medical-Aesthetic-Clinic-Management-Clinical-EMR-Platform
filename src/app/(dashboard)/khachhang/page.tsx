import Link from 'next/link';
import { CalendarDays, Clock, Phone, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function KhachHangDashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} className="text-yellow-300" />
            <span>Phòng khám Da liễu & Thẩm mỹ Công nghệ cao</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Chào mừng Quý khách đến với Cổng dịch vụ trực tuyến
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Chủ động đặt lịch khám, chọn bác sĩ và thời gian mong muốn chỉ với vài thao tác đơn giản. Hệ thống tự động xác nhận và giữ chỗ cho quý khách.
          </p>
          <div className="pt-2">
            <Link
              href="/khachhang/appointments"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-600 shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all"
            >
              <CalendarDays size={18} />
              <span>Đặt lịch khám ngay</span>
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 -mb-10 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Quy chuẩn lịch hẹn 30 phút</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Mỗi lịch khám được phân cách tối thiểu 30 phút để bác sĩ có thời gian thăm khám kỹ lưỡng và tư vấn phác đồ chuẩn y khoa.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Đội ngũ Bác sĩ chuyên khoa</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            100% bác sĩ da liễu và kỹ thuật viên có chứng chỉ hành nghề, nhiều năm kinh nghiệm trong điều trị mụn, sẹo, nám và trẻ hóa da.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <HeartHandshake size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Hỗ trợ & Tiếp đón ân cần</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Bộ phận lễ tân luôn sẵn sàng hỗ trợ, nhắc hẹn trước giờ khám và giải đáp mọi thắc mắc của quý khách hàng.
          </p>
        </div>
      </div>

      {/* Contact info bar */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Phone size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Hotline hỗ trợ đặt lịch 24/7</div>
            <div className="text-base font-bold text-white">1900 6868 - (028) 3822 9999</div>
          </div>
        </div>
        <Link
          href="/khachhang/appointments"
          className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white transition-colors"
        >
          Đặt lịch khám ngay →
        </Link>
      </div>
    </div>
  );
}
