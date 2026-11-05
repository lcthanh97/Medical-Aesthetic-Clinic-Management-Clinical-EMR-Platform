import React from 'react'
import { Sidebar } from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-[50px] min-h-[50px] bg-white border-b border-[#e1e9f2] sticky top-0 z-20 flex items-center px-6 md:px-8">
          <div className="flex-1 md:hidden">
            {/* Mobile menu toggle space, handled by Sidebar */}
          </div>
          <div className="flex-1 text-right text-xs text-[#6c7e93] font-medium hidden md:block" suppressHydrationWarning>
            Dữ liệu minh họa · {new Date().toLocaleDateString('vi-VN')}
          </div>
        </header>
        <main className="flex-1 p-5 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
