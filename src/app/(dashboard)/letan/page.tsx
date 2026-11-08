import prisma from '@/infrastructure/database/prisma';
import { ArrowRight, CalendarDays, ClipboardSignature, CreditCard, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LetanDashboardPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [patients, appointments, waiting, invoices, consents] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({ where: { scheduledAt: { gte: start, lt: end } } }),
    prisma.visit.count({ where: { status: { in: ['WAITING', 'REGISTERED'] } } }),
    prisma.invoice.count({ where: { status: { not: 'PAID' } } }),
    prisma.signedConsent.count({ where: { signedAt: { gte: start, lt: end } } }),
  ]);

  const sections = [
    {
      title: 'Tiếp đón bệnh nhân',
      description: 'Quản lý danh sách chờ khám trong ngày, check-in tạo lượt khám và ghi nhận tiền sử dị ứng.',
      href: '/letan/reception',
      icon: Users,
    },
    {
      title: 'Lịch hẹn phòng khám',
      description: 'Tiếp nhận yêu cầu hẹn khám qua điện thoại hoặc khách vãng lai, áp dụng quy chuẩn cách 30 phút.',
      href: '/letan/appointments',
      icon: CalendarDays,
    },
    {
      title: 'Thanh toán & Viện phí',
      description: 'Lập hóa đơn và thu tiền dịch vụ, điều trị thẩm mỹ, xét nghiệm và đơn thuốc qua Tiền mặt hoặc VNPay.',
      href: '/letan/billing',
      icon: CreditCard,
    },
    {
      title: 'Biểu mẫu & Cam kết',
      description: 'Quản lý giấy cam kết, đồng thuận điều trị laser và thủ thuật thẩm mỹ theo quy định y tế.',
      href: '/letan/consents',
      icon: ClipboardSignature,
    },
  ];

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 text-[#20334b]">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-[25px] font-bold text-[#20334b]">Khu vực làm việc Lễ tân</h1>
          <p className="mt-1 text-[12px] text-[#6c7e93]">
            Hệ thống tiếp đón bệnh nhân, sắp xếp lịch hẹn và quản lý thủ tục viện phí ngày {start.toLocaleDateString('vi-VN')}
          </p>
        </div>
        <Link
          href="/letan/reception"
          className="inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#246dce] hover:bg-[#1f5cb0] px-4 text-[12px] font-semibold text-white shadow-xs transition-colors self-start md:self-auto"
        >
          <Users size={15} /> Tiếp nhận bệnh nhân mới
        </Link>
      </header>

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          [patients, 'Tổng hồ sơ bệnh nhân', Users],
          [appointments, 'Lịch hẹn hôm nay', CalendarDays],
          [waiting, 'Bệnh nhân chờ khám', Users],
          [invoices, 'Hóa đơn chờ thu', CreditCard],
          [consents, 'Cam kết đã ký', ClipboardSignature],
        ].map(([value, label, Icon]: any) => (
          <article key={String(label)} className="rounded-[9px] border border-[#dce5ef] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6c7e93] font-medium">{label}</span>
              <Icon size={16} className="text-[#246dce]" />
            </div>
            <strong className="mt-2.5 block text-[26px] font-bold text-[#20334b]">
              {Number(value).toLocaleString('vi-VN')}
            </strong>
          </article>
        ))}
      </section>

      {/* Functional Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group rounded-[9px] border border-[#dce5ef] bg-white p-5 hover:border-[#246dce] hover:bg-[#fbfdff] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[7px] bg-[#edf5ff] text-[#246dce] group-hover:bg-[#246dce] group-hover:text-white transition-colors">
                  <sec.icon size={20} />
                </div>
              </div>
              <h2 className="text-[16px] font-bold text-[#20334b] group-hover:text-[#246dce] transition-colors">
                {sec.title}
              </h2>
              <p className="mt-1 text-[12px] text-[#6c7e93] leading-relaxed">
                {sec.description}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#246dce] group-hover:translate-x-1 transition-transform">
              <span>Mở chức năng</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
