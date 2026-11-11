import { ClientLayout } from '@/components/client/ClientLayout'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'
import { getPatientSession } from '@/server/auth/patient-session'

export const dynamic = 'force-dynamic'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getPatientSession()
  const data = session ? await getClientPortalData(session.patientId) : { patient: null }
  return <ClientLayout patient={data.patient ? { name: data.patient.name, code: data.patient.code } : null}>{children}</ClientLayout>
}
