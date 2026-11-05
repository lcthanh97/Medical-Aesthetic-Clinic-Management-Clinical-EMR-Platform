import { receptionController } from '@/server/common/container';

export async function GET(
  _request: Request,
  props: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await props.params;
  return receptionController.getPatientDetail(patientId);
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await props.params;
  return receptionController.updatePatient(patientId, request);
}

