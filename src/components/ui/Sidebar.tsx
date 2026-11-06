'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  Settings,
  ShieldAlert,
  UserCircle,
  CreditCard,
  Stethoscope,
  ClipboardSignature,
  BookOpenCheck,
  FileText,
  Package,
  Bell,
  Pill,
  Users,
  BarChart3,
  Activity,
  Image as ImageIcon,
  Menu,
  X,
  User,
  Sparkles,
  ChevronRight,
  Plus,
  CircleHelp,
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
      { href: '/bacsi', icon: LayoutDashboard, label: 'Tổng quan bác sĩ', description: 'Tình hình và lịch khám được phân công' },
      { href: '/bacsi/queue', icon: ListOrdered, label: 'Hàng đợi khám', description: 'Các lượt khám được phân công' },
      { href: '/bacsi/emr', icon: FileText, label: 'Hồ sơ bệnh nhân', description: 'Bệnh án & Visit được phân công' },
      { href: '/bacsi/examination', icon: Stethoscope, label: 'Khám bệnh & chỉ định', description: 'Bệnh án và kết quả CLS theo Visit' },
      { href: '/bacsi/prescriptions', icon: Pill, label: 'Kê đơn thuốc', description: 'Đơn thuốc điện tử' },
      { href: '/bacsi/treatments', icon: Activity, label: 'Phác đồ điều trị', description: 'Phiên bản, giai đoạn và buổi điều trị' },
      { href: '/bacsi/treatment-sessions', icon: ListOrdered, label: 'Buổi điều trị', description: 'Theo dõi buổi trong Visit được phân công' },
      { href: '/bacsi/images', icon: ImageIcon, label: 'Ảnh theo dõi', description: 'Timeline metadata ảnh trong Visit được phân công' },
      { href: '/bacsi/consents', icon: ClipboardSignature, label: 'Cam kết điều trị', description: 'Cam kết đã ghi nhận trong Visit được phân công' },
      { href: '/bacsi/protocol-library', icon: BookOpenCheck, label: 'Thư viện phác đồ', description: 'Tra cứu mẫu phác đồ và phiên bản' },
    ],
  },
  {
    id: 'admin',
    name: 'Quản trị viên',
    badge: 'Hệ thống',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    items: [
      { href: '/admin/inventory', icon: Package, label: 'Kho dược & Vật tư', description: 'Quản lý thuốc & thiết bị' },
      { href: '/admin/reports', icon: BarChart3, label: 'Báo cáo & Thống kê', description: 'Doanh thu & Số liệu' },
      { href: '/admin/administration', icon: Settings, label: 'Quản trị phòng khám', description: 'Phân quyền & Cấu hình' },
      { href: '/admin/audit', icon: ShieldAlert, label: 'Nhật ký hệ thống', description: 'Audit logs' },
      { href: '/admin/notifications', icon: Bell, label: 'Thông báo nội bộ', description: 'Hệ thống tin nhắn' },
      { href: '/admin/auth', icon: UserCircle, label: 'Tài khoản & Xác thực', description: 'Bảo mật tài khoản' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [showDoctorHelp, setShowDoctorHelp] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'all' | 'khachhang' | 'letan' | 'bacsi' | 'admin'>('all')
  const isDoctorMode = pathname === '/bacsi' || pathname?.startsWith('/bacsi/') === true

  const filteredGroups = isDoctorMode
    ? ROLE_GROUPS.filter((group) => group.id === 'bacsi')
    : selectedRole === 'all'
      ? ROLE_GROUPS
      : ROLE_GROUPS.filter(g => g.id === selectedRole)

  return (
    <>
      <button 
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed top-4 left-4 z-50 rounded-lg border p-2 shadow-lg ${isDoctorMode ? 'border-[#d7e2ef] bg-white/90 text-[#365678]' : 'border-slate-200/50 bg-white/80 text-slate-700 shadow-slate-200/50'} backdrop-blur-md`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`
        fixed inset-y-0 left-0 z-40 ${isDoctorMode ? 'w-[224px] bg-[#edf4fd] text-[#405674] border-[#d7e4f2] shadow-none' : 'w-[290px] bg-[#0f172a] text-slate-300 border-slate-800/60 shadow-2xl'} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        md:translate-x-0 md:static md:flex-shrink-0 flex flex-col h-screen border-r
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `} data-doctor-mode={isDoctorMode ? 'true' : undefined}>
        {/* Header */}
        <Link href="/" className={`group flex items-center transition-colors ${isDoctorMode ? 'mx-2 mt-6 mb-6 h-[34px] gap-[10px] border-0 bg-transparent px-0' : 'h-[72px] gap-3 border-b border-slate-800/60 bg-slate-900/95 px-6 hover:bg-slate-800/40'}`}>
          <div className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${isDoctorMode ? 'bg-[#2563C9] text-white' : 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-blue-500/20 ring-1 ring-white/10'}`}>
            {isDoctorMode ? <Plus size={23} strokeWidth={2.5} /> : <Stethoscope className="text-white drop-shadow-md" size={22} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-col">
            <h1 className={`font-bold leading-tight tracking-tight ${isDoctorMode ? 'text-[19px] text-[#1B2A41]' : 'text-[16px] text-white'}`}>{isDoctorMode ? 'Clinic EMR' : 'Dermatology EMR'}</h1>
            <p className={`flex items-center gap-1 font-semibold uppercase ${isDoctorMode ? 'text-[10px] tracking-[0.05px] text-[#3170B5]' : 'text-[9px] tracking-widest text-blue-400'}`}>
              <span>{isDoctorMode ? 'Phòng khám da liễu' : 'Clinic Platform'}</span>
              {!isDoctorMode && <Sparkles size={10} className="text-yellow-400" />}
            </p>
          </div>
        </Link>

        {/* Role Filter Tabs */}
        {!isDoctorMode && <div className="px-3 py-3 border-b border-slate-800/50 bg-slate-900/50">
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
        </div>}

        {/* Navigation list */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDoctorMode ? 'space-y-3 px-2.5 py-0' : 'space-y-6 px-3 py-4'}`}>
          {filteredGroups.map(group => (
            <div key={group.id} className="space-y-1">
              <div className={`flex items-center justify-between px-2 ${isDoctorMode ? 'mb-6' : 'mb-2'}`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDoctorMode ? 'text-[#6B809B]' : 'text-slate-400'}`}>
                  {isDoctorMode ? 'Không gian bác sĩ' : group.name}
                </span>
                {!isDoctorMode && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${group.badgeColor}`}>
                  {group.badge}
                </span>}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isRootRoute = item.href === '/khachhang' || item.href === '/letan' || item.href === '/bacsi' || item.href === '/admin'
                  const isActive = pathname === item.href || (!isRootRoute && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex min-h-[44px] items-center gap-[10px] rounded-lg px-[9px] py-2 transition-all duration-200 ${isDoctorMode ? (isActive ? 'bg-[#DCEBFC] text-[#165CAE]' : 'text-[#30435D] hover:bg-[#e5effb] hover:text-[#315a86]') : (isActive ? 'bg-blue-600/15 text-blue-300 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-md before:bg-blue-500' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100')}`}
                    >
                      <div className={`flex-shrink-0 rounded-lg p-1.5 transition-colors duration-200 ${isDoctorMode ? (isActive ? 'bg-transparent text-[#2563C9]' : 'bg-transparent text-[#6A829F] group-hover:text-[#246dce]') : (isActive ? 'bg-blue-500/25 text-blue-400' : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700/80 group-hover:text-slate-200')}`}>
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`truncate font-semibold ${isDoctorMode ? 'text-[12px]' : 'text-[13px]'} ${isActive ? (isDoctorMode ? 'font-bold text-[#165CAE]' : 'font-bold text-blue-300') : ''}`}>
                          {item.label}
                        </span>
                        {!isDoctorMode && <span className="truncate text-[10px] text-slate-500">{item.description}</span>}
                      </div>
                      {isActive && <ChevronRight size={14} className={isDoctorMode ? 'text-[#246dce]' : 'text-blue-400'} />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer profile */}
        {isDoctorMode ? (
          <div className="px-3 pb-6 pt-4">
            <button type="button" onClick={() => setShowDoctorHelp((open) => !open)} aria-expanded={showDoctorHelp} aria-controls="doctor-help" className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left text-xs text-[#7890AC] hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8CBBFF]">
              <CircleHelp size={16} aria-hidden="true" /> Hướng dẫn &amp; hỗ trợ
            </button>
            {showDoctorHelp && <div id="doctor-help" role="region" aria-label="Hướng dẫn khu vực bác sĩ" className="mx-1 rounded-lg border border-[#DCE6F1] bg-white p-3 text-[11px] leading-5 text-[#66758C]">Chọn một trang trong menu để xem dữ liệu thuộc Visit được phân công. Nếu trang báo thiếu quyền hoặc không tải được dữ liệu, hãy liên hệ quản trị viên phòng khám.</div>}
          </div>
        ) : <div className="border-t border-slate-800/60 bg-slate-900/95 p-3">
          <div className={`flex items-center gap-3 rounded-lg border p-2 ${isDoctorMode ? 'border-[#d7e4f2] bg-white' : 'border-slate-700/50 bg-slate-800/40'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${isDoctorMode ? 'bg-[#e0efff] text-[#246dce]' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md'}`}>
              {isDoctorMode ? 'BS' : 'A'}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className={`truncate text-xs font-bold ${isDoctorMode ? 'text-[#263a56]' : 'text-slate-200'}`}>{isDoctorMode ? 'Phạm vi bác sĩ' : 'Hệ thống phân quyền'}</span>
              <span className={`truncate text-[10px] font-medium ${isDoctorMode ? 'text-[#7186a3]' : 'text-emerald-400'}`}>{isDoctorMode ? 'Visit được phân công' : '● Đang hoạt động'}</span>
            </div>
          </div>
        </div>}
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
