import React from 'react'
import { Sidebar } from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-[72px] bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center px-6 md:px-8 shadow-sm">
          <div className="flex-1 md:hidden">
            {/* Mobile menu toggle space, handled by Sidebar */}
          </div>
          <div className="flex-1 text-right text-sm text-slate-500 font-medium hidden md:block" suppressHydrationWarning>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
