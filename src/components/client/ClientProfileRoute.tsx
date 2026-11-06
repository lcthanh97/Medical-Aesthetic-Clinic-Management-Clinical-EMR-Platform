import { ClientProfilePage } from './ClientProfilePage'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'
import { getPatientSession } from '@/server/auth/patient-session'
import { redirect } from 'next/navigation'

export async function ClientProfileRoute({ type }: { type: string }) {
  const session = await getPatientSession()
  if (!session) redirect('/khachhang/dang-nhap')
  const data = await getClientPortalData(session.patientId)
  return <ClientProfilePage type={type} data={data}/>
}
