import prisma from '@/infrastructure/database/prisma';
import { ArrowRight, CalendarDays, ClipboardSignature, CreditCard, Users } from 'lucide-react';
import Link from 'next/link';

export default async function LetanDashboardPage() {
  const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
  const [patients,appointments,waiting,invoices,consents]=await Promise.all([
    prisma.patient.count(), prisma.appointment.count({where:{scheduledAt:{gte:start,lt:end}}}),
    prisma.visit.count({where:{status:{in:['WAITING','REGISTERED']}}}), prisma.invoice.count({where:{status:{not:'PAID'}}}),
    prisma.signedConsent.count({where:{signedAt:{gte:start,lt:end}}}),
  ]);
  const sections = [
    {
      title: 'Tiếp đón bệnh nhân',
      description: 'Quản lý danh sách chờ khám trong ngày, check-in tạo lượt khám và ghi nhận tiền sử dị ứng.',
      href: '/letan/reception',
      icon: Users,
      color: 'bg-emerald-500',
      badge: 'Chính',
    },
    {
      title: 'Đặt lịch hẹn',
      description: 'Tiếp nhận yêu cầu hẹn khám qua điện thoại hoặc khách vãng lai, áp dụng quy chuẩn cách 30 phút.',
      href: '/letan/appointments',
      icon: CalendarDays,
      color: 'bg-blue-500',
    },
    {
      title: 'Thu ngân & Viện phí',
      description: 'Lập hóa đơn và thu tiền dịch vụ, điều trị thẩm mỹ, xét nghiệm và đơn thuốc.',
      href: '/letan/billing',
      icon: CreditCard,
      color: 'bg-amber-500',
    },
    {
      title: 'Biểu mẫu & Cam kết',
      description: 'Quản lý giấy cam kết, đồng thuận điều trị laser và thủ thuật thẩm mỹ theo quy định y tế.',
      href: '/letan/consents',
      icon: ClipboardSignature,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
          📋 Phân hệ Bộ phận Lễ tân
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Khu vực làm việc Lễ tân</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống điều phối tiếp đón bệnh nhân, sắp xếp lịch hẹn và thủ tục tài chính ban đầu.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[[patients,'Bệnh nhân'],[appointments,'Lịch hôm nay'],[waiting,'Đang chờ'],[invoices,'Hóa đơn chờ'],[consents,'Cam kết hôm nay']].map(([value,label])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><strong className="text-2xl text-slate-900">{Number(value).toLocaleString('vi-VN')}</strong><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group relative rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${sec.color} text-white flex items-center justify-center shadow-md`}>
                  <sec.icon size={24} />
                </div>
                {sec.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {sec.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors mb-2">
                {sec.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">{sec.description}</p>
            </div>
            <div className="pt-6 flex items-center gap-2 text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Truy cập chức năng</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
