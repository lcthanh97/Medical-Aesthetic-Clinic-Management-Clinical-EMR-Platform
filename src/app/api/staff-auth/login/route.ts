import { NextResponse } from 'next/server';
import {
  authenticateStaff,
  createStaffToken,
  STAFF_SESSION_COOKIE,
  type StaffPortal,
} from '@/server/auth/staff-session';

export async function POST(request: Request) {
  const { identifier, password, portal } = await request.json().catch(() => ({}));

  if (
    !['letan', 'admin'].includes(portal) ||
    typeof identifier !== 'string' ||
    typeof password !== 'string'
  ) {
    return NextResponse.json({ error: 'Thông tin đăng nhập không hợp lệ.' }, { status: 400 });
  }

  try {
    const staff = await authenticateStaff(identifier, password, portal as StaffPortal);
    if (!staff) {
      return NextResponse.json(
        { error: 'Sai tài khoản, mật khẩu hoặc vai trò không phù hợp.' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(STAFF_SESSION_COOKIE, createStaffToken(staff), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 28800,
    });
    return response;
  } catch (error) {
    console.error('Staff login failed:', error);
    return NextResponse.json(
      { error: 'Đăng nhập tạm thời không khả dụng. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
