import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import prisma from '@/infrastructure/database/prisma';

export const PATIENT_SESSION_COOKIE = 'clinic_patient_session';
export type PatientSession = { patientId: string; patientCode: string; fullName: string; exp: number };

function secret() {
  const value = process.env.JWT_ACCESS_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_ACCESS_SECRET chưa được cấu hình an toàn.');
  return value;
}
function sign(payload: string) { return createHmac('sha256', secret()).update(`patient:${payload}`).digest('base64url'); }
export function createPatientSessionToken(session: Omit<PatientSession, 'exp'>) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function decode(token?: string): PatientSession | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as PatientSession; return value.exp > Date.now() ? value : null; } catch { return null; }
}
export async function getPatientSession() { return decode((await cookies()).get(PATIENT_SESSION_COOKIE)?.value); }
export async function authenticatePatient(patientCode: string, phone: string) {
  const normalizedPhone = phone.replace(/\D/g, '');
  const patient = await prisma.patient.findUnique({ where: { patientCode: patientCode.trim().toUpperCase() } });
  if (!patient?.phone || patient.phone.replace(/\D/g, '') !== normalizedPhone) return null;
  return { patientId: patient.id, patientCode: patient.patientCode, fullName: patient.fullName };
}
