'use client'

import type { ReactNode } from 'react'
import { Search, UserRound } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'

function DoctorChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F7FB] text-[#1B2A41]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex min-h-[67px] flex-wrap items-center gap-4 border-b border-[#E3E9F2] bg-white px-4 py-2.5 sm:px-6 lg:flex-nowrap lg:px-7">
          <form action="/bacsi/queue" method="get" role="search" className="relative w-full max-w-[305px]">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66809D]" />
            <label className="sr-only" htmlFor="doctor-global-search">Tìm lượt khám được phân công</label>
            <input
              id="doctor-global-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Tìm bệnh nhân, mã hồ sơ..."
              className="h-10 w-full rounded-lg border border-[#DCE6F1] bg-white pl-9 pr-3 text-sm text-[#1B2A41] outline-none transition placeholder:text-[#7C8DA5] focus:border-[#3980dc] focus:ring-2 focus:ring-blue-100"
            />
          </form>
          <div className="hidden flex-1 text-xs text-[#788CA5] lg:block" suppressHydrationWarning>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-[#F6F8FC] px-3 py-1.5 text-[11px] font-medium text-[#7C8DA5] sm:inline-flex">
              Visit được phân công
            </span>
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#E1EEFD] text-[11px] font-bold text-[#2565A6]" aria-hidden="true">
              BS
            </span>
            <div className="hidden min-w-[128px] sm:block">
              <p className="text-[11px] font-semibold text-[#1B2A41]">Khu vực bác sĩ</p>
              <p className="mt-0.5 text-[10px] text-[#8392A8]">Hồ sơ theo quyền truy cập</p>
            </div>
            <UserRound size={17} aria-hidden="true" className="text-[#7186A3] sm:hidden" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-[30px]">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap justify-between gap-2 px-4 pb-4 text-[10px] text-[#8092AA] sm:px-6 lg:px-7">
          <span>Clinic EMR · Chỉ sử dụng cho công việc chuyên môn</span>
          <span>Bảo mật hồ sơ bệnh nhân</span>
        </footer>
      </div>
    </div>
  )
}

export function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const isDoctorRoute = pathname === '/bacsi' || pathname.startsWith('/bacsi/')

  if (isDoctorRoute) return <DoctorChrome>{children}</DoctorChrome>

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-slate-200 bg-white px-6 shadow-sm md:px-8">
          <div className="flex-1 text-right text-sm font-medium text-slate-500" suppressHydrationWarning>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
