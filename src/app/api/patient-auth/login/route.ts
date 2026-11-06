import { NextResponse } from 'next/server';
import { authenticatePatient, createPatientSessionToken, PATIENT_SESSION_COOKIE } from '@/server/auth/patient-session';

export async function POST(request: Request) {
  const { patientCode, phone } = await request.json().catch(() => ({}));
  if (typeof patientCode !== 'string' || typeof phone !== 'string') return NextResponse.json({ error: 'Vui lòng nhập mã bệnh nhân và số điện thoại.' }, { status: 400 });
  const patient = await authenticatePatient(patientCode, phone);
  if (!patient) return NextResponse.json({ error: 'Mã bệnh nhân hoặc số điện thoại không đúng.' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(PATIENT_SESSION_COOKIE, createPatientSessionToken(patient), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}
