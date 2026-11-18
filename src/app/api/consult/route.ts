import { handleConsult } from '@/features/derma-beta/server/consultGateway'
import { getPatientSession } from '@/server/auth/patient-session'

export async function POST(request: Request) {
  return handleConsult(request, async () => {
    const session = await getPatientSession()
    return session ? `patient:${session.patientId}` : null
  }, true)
}
