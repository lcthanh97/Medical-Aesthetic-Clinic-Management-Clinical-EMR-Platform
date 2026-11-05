'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Settings,
  ShieldAlert,
  UserCircle,
  CreditCard,
  Stethoscope,
  ClipboardSignature,
  Package,
  Pill,
  Users,
  Activity,
  Menu,
  X,
  User,
  Sparkles,
  ChevronRight
  ,LayoutDashboard, Library, Images
} from 'lucide-react'

export interface RoleItem {
  href: string;
  icon: any;
  label: string;
  description: string;
}

export interface RoleGroup {
  id: 'khachhang' | 'letan' | 'bacsi' | 'admin';
  name: string;
  badge: string;
  badgeColor: string;
  items: RoleItem[];
}

export const ROLE_GROUPS: RoleGroup[] = [
  {
    id: 'khachhang',
    name: 'Khách hàng',
    badge: 'Portal',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    items: [
      { href: '/khachhang/appointments', icon: CalendarDays, label: 'Đặt lịch khám', description: 'Cổng đặt lịch online' },
      { href: '/khachhang', icon: User, label: 'Cổng dịch vụ', description: 'Thông tin & Bảng giá' },
    ],
  },
  {
    id: 'letan',
    name: 'Lễ tân',
    badge: 'Tiếp đón',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    items: [
      { href: '/letan/reception', icon: Users, label: 'Tiếp đón bệnh nhân', description: 'Danh sách chờ & Check-in' },
      { href: '/letan/appointments', icon: CalendarDays, label: 'Lịch hẹn phòng khám', description: 'Đặt & duyệt lịch hẹn' },
      { href: '/letan/billing', icon: CreditCard, label: 'Thanh toán & Viện phí', description: 'Hóa đơn dịch vụ' },
      { href: '/letan/consents', icon: ClipboardSignature, label: 'Biểu mẫu & Cam kết', description: 'Ký giấy đồng thuận' },
    ],
  },
  {
    id: 'bacsi',
    name: 'Bác sĩ',
    badge: 'Lâm sàng',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    items: [
      { href: '/bacsi/treatments', icon: Activity, label: 'Quá trình điều trị', description: 'Phác đồ, tương tác thuốc' },
      { href: '/bacsi/clinical-services', icon: Stethoscope, label: 'Dịch vụ lâm sàng', description: 'Khám & Xét nghiệm da' },
      { href: '/bacsi/prescriptions', icon: Pill, label: 'Kê đơn thuốc', description: 'Đơn thuốc điện tử' },
    ],
  },
  {
    id: 'admin',
    name: 'Quản trị viên',
    badge: 'Hệ thống',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    items: [
      { href: '/admin/inventory', icon: Package, label: 'Kho dược & Vật tư', description: 'Quản lý thuốc & thiết bị' },
      { href: '/admin/administration', icon: Settings, label: 'Quản trị phòng khám', description: 'Phân quyền & Cấu hình' },
      { href: '/admin/audit', icon: ShieldAlert, label: 'Nhật ký hệ thống', description: 'Audit logs' },
      { href: '/admin/auth', icon: UserCircle, label: 'Tài khoản & Xác thực', description: 'Bảo mật tài khoản' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'all' | 'khachhang' | 'letan' | 'bacsi' | 'admin'>('all')

  const filteredGroups = selectedRole === 'all' 
    ? ROLE_GROUPS 
    : ROLE_GROUPS.filter(g => g.id === selectedRole)

  if (pathname?.startsWith('/bacsi')) {
    const doctorItems = [
      { href: '/bacsi', icon: LayoutDashboard, label: 'Tổng quan bác sĩ' },
      { href: '/reception/visits', icon: Users, label: 'Hàng đợi khám', badge: '08' },
      { href: '/bacsi/clinical-services', icon: Stethoscope, label: 'Khám bệnh & Chỉ định' },
      { href: '/bacsi/prescriptions', icon: Pill, label: 'Kê đơn' },
      { href: '/bacsi/treatments', icon: Activity, label: 'Phác đồ điều trị' },
      { href: '/bacsi/treatments', icon: CalendarDays, label: 'Buổi điều trị' },
      { href: '/bacsi/treatments', icon: Images, label: 'Ảnh theo dõi' },
      { href: '/letan/consents', icon: ClipboardSignature, label: 'Cam kết điều trị' },
      { href: '/bacsi/treatments', icon: Library, label: 'Thư viện phác đồ' },
    ];
    return <aside className="hidden h-screen w-[224px] shrink-0 flex-col border-r border-[#e1e9f2] bg-[#edf5ff] px-[14px] pb-5 pt-[26px] text-[#20334b] md:flex">
      <Link href="/bacsi" className="flex items-center gap-2.5 px-2"><span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#246dce] text-xl font-semibold text-white">+</span><span><strong className="block text-[19px] leading-5">Clinic EMR</strong><small className="text-[9px] font-medium text-[#235f9e]">PHÒNG KHÁM ĐA KHOA</small></span></Link>
      <p className="mb-3 mt-6 px-2 text-[10px] font-semibold tracking-wide text-[#6c7e93]">KHÔNG GIAN BÁC SĨ</p>
      <nav className="space-y-1.5">{doctorItems.map(item=>{const active=item.href==='/bacsi'?pathname==='/bacsi':pathname.startsWith(item.href);return <Link key={item.label} href={item.href} className={`flex h-11 items-center gap-2.5 rounded-[7px] px-2.5 text-[12px] ${active?'bg-[#ddedfe] font-semibold text-[#235f9e]':'hover:bg-white/70'}`}><item.icon size={17}/><span className="flex-1">{item.label}</span>{item.badge&&<span className="rounded-full bg-white px-2 py-1 font-semibold text-[#235f9e]">{item.badge}</span>}</Link>})}</nav>
      <div className="mt-auto rounded-[10px] bg-white p-3 text-[10px]"><strong className="block text-[11px]">Phòng khám An Tâm</strong><span className="mt-1 block text-[#6c7e93]">Cơ sở 01 · Phòng khám 03</span><span className="mt-2 block text-emerald-600">● Hệ thống sẵn sàng</span></div>
    </aside>
  }

  return (
    <>
      <button 
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg shadow-slate-200/50 text-slate-700 border border-slate-200/50"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`
        fixed inset-y-0 left-0 z-40 w-[290px] bg-[#0f172a] text-slate-300 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        md:translate-x-0 md:static md:flex-shrink-0 flex flex-col h-screen border-r border-slate-800/60 shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <Link href="/" className="flex items-center h-[72px] border-b border-slate-800/60 bg-slate-900/95 px-6 gap-3 group hover:bg-slate-800/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
            <Stethoscope className="text-white drop-shadow-md" size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-bold text-white tracking-tight leading-tight">Dermatology EMR</h1>
            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest flex items-center gap-1">
              <span>Clinic Platform</span>
              <Sparkles size={10} className="text-yellow-400" />
            </p>
          </div>
        </Link>

        {/* Role Filter Tabs */}
        <div className="px-3 py-3 border-b border-slate-800/50 bg-slate-900/50">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Lọc theo vai trò:
          </div>
          <div className="grid grid-cols-5 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 text-[11px] font-semibold text-center">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'khachhang', label: 'Khách' },
              { id: 'letan', label: 'Lễ tân' },
              { id: 'bacsi', label: 'Bác sĩ' },
              { id: 'admin', label: 'Admin' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                suppressHydrationWarning
                onClick={() => setSelectedRole(tab.id as any)}
                className={`py-1 rounded-lg transition-all truncate ${
                  selectedRole === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-6 custom-scrollbar">
          {filteredGroups.map(group => (
            <div key={group.id} className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${group.badgeColor}`}>
                  {group.badge}
                </span>
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/khachhang' && item.href !== '/letan' && item.href !== '/bacsi' && item.href !== '/admin' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        group flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-blue-600/15 text-blue-300 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-500 before:rounded-r-md' 
                          : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'}
                      `}
                    >
                      <div className={`
                        p-1.5 rounded-lg transition-colors duration-200 flex-shrink-0
                        ${isActive ? 'bg-blue-500/25 text-blue-400' : 'bg-slate-800/80 group-hover:bg-slate-700/80 text-slate-400 group-hover:text-slate-200'}
                      `}>
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-blue-300 font-bold' : ''}`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{item.description}</span>
                      </div>
                      {isActive && <ChevronRight size={14} className="text-blue-400" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer profile */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800/60">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              A
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-xs font-bold text-slate-200 truncate">Hệ thống phân quyền</span>
              <span className="text-[10px] text-emerald-400 font-medium truncate">● Đang hoạt động</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
