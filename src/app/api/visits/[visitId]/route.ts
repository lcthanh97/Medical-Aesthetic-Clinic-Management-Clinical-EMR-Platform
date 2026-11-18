import { getStaffSession } from '@/server/auth/staff-session';
import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  const { visitId } = await props.params;
  const result = await visitsController.getById(visitId);
  return NextResponse.json(result.body, { status: result.status });
}

