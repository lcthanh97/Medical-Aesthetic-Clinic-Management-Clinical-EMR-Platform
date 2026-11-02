import { receptionController } from '@/server/common/container';

export async function GET(
  _request: Request,
  props: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await props.params;
  return receptionController.getPatientHistory(patientId);
}

