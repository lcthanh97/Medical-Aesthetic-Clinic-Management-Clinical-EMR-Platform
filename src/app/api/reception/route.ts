import { receptionController } from '@/server/common/container';

export async function GET(request: Request) {
  return receptionController.listPatients(request);
}

export async function POST(request: Request) {
  return receptionController.createPatient(request);
}
