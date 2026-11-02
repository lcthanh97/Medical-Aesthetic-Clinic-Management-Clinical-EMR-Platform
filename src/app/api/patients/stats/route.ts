import { receptionController } from '@/server/common/container';

export async function GET() {
  return receptionController.getStats();
}

