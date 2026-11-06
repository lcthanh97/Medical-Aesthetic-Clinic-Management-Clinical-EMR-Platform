import { NextResponse } from 'next/server';
import { PATIENT_SESSION_COOKIE } from '@/server/auth/patient-session';
export async function POST(request: Request) { const response = NextResponse.redirect(new URL('/khachhang', request.url), 303); response.cookies.set(PATIENT_SESSION_COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/' }); return response; }
