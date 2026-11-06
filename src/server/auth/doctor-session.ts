import 'server-only';

import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import prisma from '@/infrastructure/database/prisma';

const scrypt = promisify(scryptCallback);
export const DOCTOR_SESSION_COOKIE = 'clinic_doctor_session';

export type DoctorSession = {
  accountId: string;
  employeeId: string;
  username: string;
  fullName: string;
  exp: number;
};

function secret() {
  const value = process.env.JWT_ACCESS_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_ACCESS_SECRET chưa được cấu hình an toàn.');
  return value;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createDoctorSessionToken(session: Omit<DoctorSession, 'exp'>) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeDoctorSessionToken(token?: string): DoctorSession | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as DoctorSession;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function getDoctorSession() {
  return decodeDoctorSessionToken((await cookies()).get(DOCTOR_SESSION_COOKIE)?.value);
}

export async function authenticateDoctor(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const account = await prisma.account.findFirst({
    where: { OR: [{ username: normalized }, { email: normalized }] },
    include: { employee: true, roles: { include: { role: true } } },
  });
  if (!account || account.status !== 'ACTIVE' || !account.employee) return null;
  const doctorRole = account.roles.some(({ role }) => {
    const name = role.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return name.includes('bac si') || name.includes('doctor');
  });
  if (!doctorRole) return null;
  const [algorithm, salt, stored] = account.passwordHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !stored) return null;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(stored, 'hex');
  if (storedBuffer.length !== derived.length || !timingSafeEqual(storedBuffer, derived)) return null;
  return { accountId: account.id, employeeId: account.employee.id, username: account.username, fullName: account.employee.fullName };
}
