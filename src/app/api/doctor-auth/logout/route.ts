import { NextResponse } from 'next/server';
import { DOCTOR_SESSION_COOKIE } from '@/server/auth/doctor-session';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/dang-nhap/bac-si', request.url), 303);
  response.cookies.set(DOCTOR_SESSION_COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/' });
  return response;
}
