import Link from 'next/link';
import { CalendarDays, Users, Stethoscope, Settings, Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Clock } from 'lucide-react';

export default function Home() {
  const roles = [
    {
      id: 'khachhang',
      title: 'Khách hàng / Bệnh nhân',
      subtitle: 'Cổng dịch vụ trực tuyến',
      description: 'Chủ động đặt lịch khám online với bác sĩ chuyên khoa da liễu, chọn khung giờ thuận tiện (chuẩn cách nhau 30 phút).',
      href: '/khachhang/appointments',
      badge: 'Bệnh nhân',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: CalendarDays,
      buttonText: 'Đặt lịch khám ngay',
      buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
      accentColor: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'letan',
      title: 'Bộ phận Lễ tân',
      subtitle: 'Tiếp đón & Thủ tục',
      description: 'Tiếp đón bệnh nhân tại sảnh, check-in tạo lượt khám vào hàng đợi, thanh toán viện phí và quản lý biểu mẫu cam kết.',
      href: '/letan/reception',
      badge: 'Lễ tân / Thu ngân',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: Users,
      buttonText: 'Mở bàn Tiếp đón',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
      accentColor: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'bacsi',
      title: 'Bác sĩ Điều trị',
      subtitle: 'Nghiệp vụ lâm sàng & EMR',
      description: 'Khám bệnh, tra cứu bệnh án EMR, lập phác đồ điều trị, hệ thống cảnh báo tương tác thuốc và kê đơn điện tử.',
      href: '/bacsi/emr',
      badge: 'Bác sĩ / Kỹ thuật viên',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      icon: Stethoscope,
      buttonText: 'Mở phòng khám Bác sĩ',
      buttonColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
      accentColor: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'admin',
      title: 'Quản trị & Vận hành',
      subtitle: 'Hệ thống & Báo cáo',
      description: 'Quản lý kho dược phẩm, vật tư tiêu hao, thống kê doanh thu, theo dõi công suất thiết bị và nhật ký hệ thống.',
      href: '/admin/reports',
      badge: 'Quản trị viên',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Settings,
      buttonText: 'Mở khu vực Quản trị',
      buttonColor: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20',
      accentColor: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/10">
              <Stethoscope className="text-white drop-shadow-md" size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Dermatology Clinic & EMR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">v2.0</span>
              </div>
              <div className="text-xs text-slate-400">Phòng khám Da liễu & Thẩm mỹ Công nghệ cao</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Hệ thống hoạt động bình thường
            </span>
          </div>
        </div>
      </header>

      {/* Main hero & role selector */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-xs font-semibold text-blue-400">
            <Sparkles size={14} className="text-yellow-400" />
            <span>Phân hệ theo luồng người dùng: Khách hàng - Lễ tân - Bác sĩ - Quản trị</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Nền tảng Quản trị Lâm sàng & Điều trị Da liễu
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Vui lòng chọn luồng chức năng phù hợp với vai trò của bạn để truy cập giao diện làm việc chuyên biệt:
          </p>
        </div>

        {/* 4 Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="group relative rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 flex flex-col justify-between hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-300 shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${role.accentColor} flex items-center justify-center text-white shadow-lg`}>
                    <role.icon size={24} strokeWidth={2.2} />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${role.badgeColor}`}>
                    {role.badge}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {role.subtitle}
                </div>
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                  {role.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {role.description}
                </p>
              </div>

              <div className="pt-8">
                <Link
                  href={role.href}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold shadow-md transition-all ${role.buttonColor}`}
                >
                  <span>{role.buttonText}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
                  {role.href}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-800/80 text-center">
          <div className="flex flex-col items-center p-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Quy chuẩn lịch cách 30 phút</h3>
            <p className="text-xs text-slate-400 max-w-xs">Không trùng bác sĩ, phòng hoặc bệnh nhân, đảm bảo đúng quy chuẩn lâm sàng.</p>
          </div>

          <div className="flex flex-col items-center p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Cảnh báo tương tác hoạt chất</h3>
            <p className="text-xs text-slate-400 max-w-xs">Tự động phát hiện xung khắc hoạt chất (Retinol, BHA, Vitamin C) khi lập phác đồ.</p>
          </div>

          <div className="flex flex-col items-center p-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <HeartHandshake size={20} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Tự động trừ kho vật tư</h3>
            <p className="text-xs text-slate-400 max-w-xs">Trừ kho thuốc và vật tư tiêu hao ngay sau khi hoàn thành buổi điều trị.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        Phòng khám Da liễu & Thẩm mỹ Công nghệ cao • Clinical EMR Platform
      </footer>
    </div>
  );
}
