import { getStaffSession } from '@/server/auth/staff-session';
import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || undefined;

  const result = await visitsController.getQueueSummary(date);
  return NextResponse.json(result.body, { status: result.status });
}

