import { ConsentsPanel } from '@/features/consents'

export const dynamic = 'force-dynamic'

export default function DoctorConsentsPage() {
  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[#20334b]">Cam kết điều trị</h1>
        <p className="mt-1 text-xs text-[#6c7e93]">
          Tra cứu và ghi nhận cam kết điều trị trong không gian làm việc của bác sĩ.
        </p>
      </header>
      <ConsentsPanel />
    </main>
  )
}
