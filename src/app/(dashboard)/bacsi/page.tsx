import Link from 'next/link';
import { FileText, Activity, Stethoscope, Pill, ArrowRight } from 'lucide-react';

export default function BacSiDashboardPage() {
  const sections = [
    {
      title: 'Hồ sơ bệnh án điện tử (EMR)',
      description: 'Khám bệnh, xem chẩn đoán bệnh lý da liễu, tiền sử dị ứng và quá trình điều trị của bệnh nhân.',
      href: '/bacsi/emr',
      icon: FileText,
      color: 'bg-blue-600',
      badge: 'Trọng tâm',
    },
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
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Khu vực làm việc Bác sĩ</h1>
        <p className="text-slate-500 text-sm mt-1">
          Trung tâm nghiệp vụ lâm sàng, chẩn đoán, thiết lập phác đồ điều trị và chăm sóc da liễu chuyên sâu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group relative rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${sec.color} text-white flex items-center justify-center shadow-md`}>
                  <sec.icon size={24} />
                </div>
                {sec.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {sec.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors mb-2">
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
