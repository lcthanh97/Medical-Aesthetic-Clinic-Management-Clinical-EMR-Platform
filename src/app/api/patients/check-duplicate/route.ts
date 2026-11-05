import { receptionController } from '@/server/common/container';

export async function GET(request: Request) {
  return receptionController.checkDuplicate(request);
}

