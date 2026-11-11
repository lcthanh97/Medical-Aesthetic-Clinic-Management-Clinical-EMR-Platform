import Link from 'next/link';
import { Package, Settings, ShieldAlert, ArrowRight } from 'lucide-react';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [accounts, employees, inventoryItems, auditLogs] = await Promise.all([
    prisma.account.count(), prisma.employee.count(),
    Promise.all([prisma.medicine.count(), prisma.supply.count(), prisma.equipment.count()]).then(values=>values.reduce((sum,value)=>sum+value,0)),
    prisma.auditLog.count(),
  ]);
  const sections = [
    {
      title: 'Quản lý Kho & Thiết bị',
      description: 'Quản lý thuốc, vật tư y tế, danh mục máy thẩm mỹ công nghệ cao và tự động trừ kho theo ca điều trị.',
      href: '/admin/inventory',
      icon: Package,
      color: 'bg-amber-500',
    },
    {
      title: 'Cấu hình Phòng khám',
      description: 'Quản lý danh sách phòng khám, dịch vụ kỹ thuật, phân quyền và danh mục nhân viên y tế.',
      href: '/admin/administration',
      icon: Settings,
      color: 'bg-blue-500',
    },
    {
      title: 'Nhật ký hệ thống (Audit Logs)',
      description: 'Theo dõi và kiểm toán lịch sử truy cập, thay đổi dữ liệu bệnh án và hóa đơn đảm bảo an toàn y khoa.',
      href: '/admin/audit',
      icon: ShieldAlert,
      color: 'bg-rose-500',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị & Vận hành
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Khu vực Quản trị viên</h1>
        <p className="text-slate-500 text-sm mt-1">
          Điều hành hoạt động phòng khám, kiểm soát kho dược, giám sát số liệu kinh doanh và an toàn hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[[accounts,'Tài khoản'],[employees,'Nhân viên'],[inventoryItems,'Danh mục kho'],[auditLogs,'Nhật ký audit']].map(([value,label])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><strong className="text-2xl text-slate-900">{Number(value).toLocaleString('vi-VN')}</strong><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group relative rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl ${sec.color} text-white flex items-center justify-center shadow-md mb-4 bg-slate-900">
                <sec.icon size={24} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 group-hover:text-amber-700 transition-colors mb-2">
                {sec.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">{sec.description}</p>
            </div>
            <div className="pt-6 flex items-center gap-2 text-sm font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
              <span>Mở quản trị</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
