import { getStaffSession } from '@/server/auth/staff-session';
import { receptionController } from '@/server/common/container';

export async function GET(
  _request: Request,
  props: { params: Promise<{ patientId: string }> }
) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  const { patientId } = await props.params;
  return receptionController.getPatientHistory(patientId);
}

