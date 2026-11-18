import { getStaffSession } from '@/server/auth/staff-session';
import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function PATCH(req: NextRequest, props: RouteProps) {
  if (!await getStaffSession('letan')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  try {
    const { visitId } = await props.params;
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional for cancel
    }
    const result = await visitsController.cancelVisit(visitId, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý hủy lượt khám' },
      { status: 500 }
    );
  }
}

