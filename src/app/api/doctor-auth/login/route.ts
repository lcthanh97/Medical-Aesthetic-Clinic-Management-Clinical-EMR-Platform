import { NextResponse } from 'next/server';
import { authenticateDoctor, createDoctorSessionToken, DOCTOR_SESSION_COOKIE } from '@/server/auth/doctor-session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { identifier, password } = body ?? {};
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 });
  }
  try {
    const doctor = await authenticateDoctor(identifier, password);
    if (!doctor) return NextResponse.json({ error: 'Tài khoản, mật khẩu hoặc vai trò bác sĩ không hợp lệ.' }, { status: 401 });

    const response = NextResponse.json({ success: true, doctor: { fullName: doctor.fullName } });
    response.cookies.set(DOCTOR_SESSION_COOKIE, createDoctorSessionToken(doctor), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60,
    });
    return response;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    const timedOut = code === 'P1001' || code === 'P1002' || code === 'ETIMEDOUT'
      || (error instanceof Error && error.message.includes('connection timeout'));
    console.error('[doctor-auth] Login failed:', timedOut ? 'database connection unavailable' : 'unexpected server error', code);
    return NextResponse.json({ error: 'Máy chủ chưa thể xác thực lúc này. Vui lòng thử lại sau.' }, { status: timedOut ? 503 : 500 });
  }
}
