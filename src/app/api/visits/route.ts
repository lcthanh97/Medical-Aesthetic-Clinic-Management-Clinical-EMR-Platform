import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';
import { getStaffSession } from '@/server/auth/staff-session';
import { getReceptionDoctors } from '@/server/auth/reception-doctors';

export async function POST(req: NextRequest) {
  const actor = await getStaffSession('letan');
  if (!actor) return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập lễ tân.' }, { status: 401 });
  try {
    const body = await req.json();
    if (typeof body?.employeeId === 'string' && !(await getReceptionDoctors(body.employeeId)).length) {
      return NextResponse.json({ success: false, message: 'Bác sĩ được chọn không hoạt động hoặc không hợp lệ.' }, { status: 400 });
    }
    const result = await visitsController.createWalkInVisit(body, actor.accountId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu tiếp nhận' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const query = {
    date: searchParams.get('date') || undefined,
    roomId: searchParams.get('roomId') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  };

  const result = await visitsController.getList(query);
  return NextResponse.json(result.body, { status: result.status });
}

