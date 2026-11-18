import { getBetaReviewer } from '@/features/derma-beta/server/access'
import { handleConsult } from '@/features/derma-beta/server/consultGateway'

export async function POST(request: Request) {
  return handleConsult(request, getBetaReviewer)
}
