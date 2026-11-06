import { NextResponse } from 'next/server';
import { authenticateDoctor, createDoctorSessionToken, DOCTOR_SESSION_COOKIE } from '@/server/auth/doctor-session';

export async function POST(request: Request) {
  const { identifier, password } = await request.json().catch(() => ({}));
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 });
  }
  const doctor = await authenticateDoctor(identifier, password);
  if (!doctor) return NextResponse.json({ error: 'Tài khoản, mật khẩu hoặc vai trò bác sĩ không hợp lệ.' }, { status: 401 });
  const response = NextResponse.json({ success: true, doctor: { fullName: doctor.fullName } });
  response.cookies.set(DOCTOR_SESSION_COOKIE, createDoctorSessionToken(doctor), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60,
  });
  return response;
}
