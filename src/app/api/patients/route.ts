import { getStaffSession } from '@/server/auth/staff-session';
import { receptionController } from '@/server/common/container';

export async function GET(request: Request) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  return receptionController.listPatients(request);
}

export async function POST(request: Request) {
  if (!await getStaffSession('letan')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  return receptionController.createPatient(request);
}

