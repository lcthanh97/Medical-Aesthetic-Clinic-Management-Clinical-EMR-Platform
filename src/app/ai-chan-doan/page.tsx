import { KhachHang3DAiSection } from '@/components/client/KhachHang3DAiSection'
import { PatientBookingProvider } from '@/components/client/PatientBookingContext'
import { getPatientSession } from '@/server/auth/patient-session'

export default async function DermaAiPage() {
  const patient = await getPatientSession()
  return (
    <PatientBookingProvider name={patient?.fullName ?? null}>
      <main><KhachHang3DAiSection /></main>
    </PatientBookingProvider>
  )
}
