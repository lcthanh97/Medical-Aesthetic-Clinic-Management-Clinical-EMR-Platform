import { ClientLayout } from '@/components/client/ClientLayout'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'

export const dynamic = 'force-dynamic'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const data = await getClientPortalData()
  return <ClientLayout patient={data.patient ? { name: data.patient.name, code: data.patient.code } : null}>{children}</ClientLayout>
}
