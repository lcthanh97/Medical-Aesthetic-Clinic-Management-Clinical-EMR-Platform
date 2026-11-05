import { ClientProfilePage } from './ClientProfilePage'
import { getClientPortalData } from '@/features/client-portal/server/getClientPortalData'

export async function ClientProfileRoute({ type }: { type: string }) {
  const data = await getClientPortalData()
  return <ClientProfilePage type={type} data={data}/>
}
