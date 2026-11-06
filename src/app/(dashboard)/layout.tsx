import React from 'react'
import { DashboardChrome } from '@/components/ui/DashboardChrome'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>
}
