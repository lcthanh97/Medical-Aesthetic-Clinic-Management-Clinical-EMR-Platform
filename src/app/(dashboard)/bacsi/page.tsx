import Link from 'next/link';
import { Activity, Stethoscope, Pill, ArrowRight, CalendarCheck, Users, CircleCheck } from 'lucide-react';

export default function BacSiDashboardPage() {
  const sections = [
    {
      title: 'Quản lý phác đồ điều trị',
      description: 'Lập phác đồ, theo dõi từng bước điều trị, hệ thống cảnh báo tương tác thuốc và quản lý thiết bị.',
      href: '/bacsi/treatments',
      icon: Activity,
      color: 'bg-indigo-600',
      badge: 'Công nghệ cao',
    },
    {
      title: 'Dịch vụ lâm sàng & Cận lâm sàng',
      description: 'Chỉ định các xét nghiệm da liễu, soi da vi thể, thủ thuật chăm sóc da và điều trị laser.',
      href: '/bacsi/clinical-services',
      icon: Stethoscope,
      color: 'bg-cyan-600',
    },
    {
      title: 'Kê đơn thuốc điện tử',
      description: 'Kê đơn thuốc đặc trị, chỉ định liều lượng và cảnh báo an toàn cho bệnh nhân.',
      href: '/bacsi/prescriptions',
      icon: Pill,
      color: 'bg-violet-600',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h1 className="text-3xl font-bold tracking-tight text-[#20334b]">Chào buổi sáng, bác sĩ Linh</h1><p className="mt-1 text-sm text-[#6c7e93]">Tổng quan công việc hôm nay · Không gian bác sĩ</p></div><a href="/reception/visits" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#246dce] px-4 py-2.5 text-sm font-semibold text-white"><ArrowRight size={16}/> Mở hàng đợi khám</a></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Lượt khám hôm nay','24',CalendarCheck],['Đã hoàn tất khám','10',CircleCheck],['Bệnh nhân đang chờ','08',Users],['Buổi điều trị','04',Activity],
      ].map(([label,value,Icon]:any)=><div key={label} className="rounded-xl border border-[#e1e9f2] bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-[#6c7e93]">{label}</p><p className="mt-3 text-3xl font-semibold text-[#20334b]">{value}</p></div><Icon size={18} className="text-[#246dce]"/></div></div>)}</div>

      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group relative flex flex-col justify-between rounded-xl border border-[#e1e9f2] bg-white p-5 transition-all hover:border-[#90b9ea] hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${sec.color} text-white shadow-md`}>
                  <sec.icon size={24} />
                </div>
                {sec.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {sec.badge}
                  </span>
                )}
              </div>
              <h2 className="mb-2 text-lg font-bold text-[#20334b] transition-colors group-hover:text-[#246dce]">
                {sec.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">{sec.description}</p>
            </div>
            <div className="pt-6 flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Bắt đầu phiên làm việc</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
