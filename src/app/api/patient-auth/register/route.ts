import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export async function POST(request: Request) {
  const { fullName, phone, dateOfBirth } = await request.json().catch(() => ({}));
  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  if (cleanName.length < 2 || cleanPhone.length < 9 || cleanPhone.length > 11) return NextResponse.json({ error: 'Họ tên hoặc số điện thoại không hợp lệ.' }, { status: 400 });
  const duplicate = await prisma.patient.findFirst({ where: { phone: cleanPhone }, select: { patientCode: true } });
  if (duplicate) return NextResponse.json({ error: 'Số điện thoại đã có hồ sơ. Vui lòng đăng nhập hoặc liên hệ lễ tân.' }, { status: 409 });
  const patientCode = `BN${Date.now().toString(36).toUpperCase()}`;
  const patient = await prisma.patient.create({ data: { patientCode, fullName: cleanName, phone: cleanPhone, dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null } });
  return NextResponse.json({ patientCode: patient.patientCode }, { status: 201 });
}
