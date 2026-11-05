import Link from 'next/link';
import { CalendarDays, Clock, Phone, Sparkles, ShieldCheck, HeartHandshake, ArrowRight, Stethoscope, ScanFace, WandSparkles } from 'lucide-react';

export default function KhachHangDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f5fc4] via-[#1768d3] to-[#3b82d0] p-8 text-white shadow-lg shadow-blue-500/10 sm:p-10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} className="text-yellow-300" />
            <span>Chăm sóc da chuẩn y khoa, an tâm mỗi ngày</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Làn da khỏe mạnh bắt đầu từ một lịch hẹn đúng lúc
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Đặt lịch khám da liễu, tư vấn thẩm mỹ và lựa chọn bác sĩ phù hợp chỉ trong vài phút. Thông tin của bạn được bảo mật trong toàn bộ hành trình.
          </p>
          <div className="pt-2">
            <Link
              href="/khachhang/appointments"
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#1768d3] shadow-lg transition-all hover:bg-blue-50"
            >
              <CalendarDays size={18} />
              <span>Đặt lịch ngay</span><ArrowRight size={16}/>
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 -mb-10 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />
      </div>

      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#1768d3]">Dịch vụ nổi bật</p><h2 className="mt-1 text-2xl font-bold text-[#17324d]">Chăm sóc toàn diện cho làn da</h2></div><Link href="/khachhang/appointments" className="hidden text-sm font-semibold text-[#1768d3] sm:block">Đặt lịch dịch vụ →</Link></div><div className="grid gap-4 md:grid-cols-3">{[
        ['Khám da liễu', 'Chẩn đoán mụn, viêm da, dị ứng và các bệnh lý da thường gặp.', Stethoscope],
        ['Soi & phân tích da', 'Đánh giá chuyên sâu tình trạng da bằng thiết bị công nghệ cao.', ScanFace],
        ['Điều trị thẩm mỹ', 'Phác đồ cá nhân hóa cho nám, sẹo, trẻ hóa và phục hồi da.', WandSparkles],
      ].map(([title,desc,Icon]:any)=><div key={title} className="rounded-xl border border-[#dce8f5] bg-white p-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf5ff] text-[#1768d3]"><Icon size={20}/></span><h3 className="mt-4 font-bold text-[#17324d]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6c7e93]">{desc}</p></div>)}</div></section>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 border border-[#dce8f5]">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Quy chuẩn lịch hẹn 30 phút</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Mỗi lịch khám được phân cách tối thiểu 30 phút để bác sĩ có thời gian thăm khám kỹ lưỡng và tư vấn phác đồ chuẩn y khoa.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#dce8f5]">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Đội ngũ Bác sĩ chuyên khoa</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            100% bác sĩ da liễu và kỹ thuật viên có chứng chỉ hành nghề, nhiều năm kinh nghiệm trong điều trị mụn, sẹo, nám và trẻ hóa da.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#dce8f5]">
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
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-[#17324d] p-5 text-white sm:flex-row">
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
