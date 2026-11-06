import { ClientProfilePage } from './ClientProfilePage'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'
import { getPatientSession } from '@/server/auth/patient-session'
import { redirect } from 'next/navigation'

export async function ClientProfileRoute({ type }: { type: string }) {
  const session = await getPatientSession()
  if (!session) redirect('/dang-nhap/khach-hang')
  const data = await getClientPortalData(session.patientId)
  return <ClientProfilePage type={type} data={data}/>
}
