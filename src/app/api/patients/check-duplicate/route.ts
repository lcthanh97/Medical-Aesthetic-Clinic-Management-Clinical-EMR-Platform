import { getStaffSession } from '@/server/auth/staff-session';
import { receptionController } from '@/server/common/container';

export async function GET(request: Request) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  return receptionController.checkDuplicate(request);
}

