import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

export async function GET(request: NextRequest) {
  try {
    const session = await getDoctorSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
    const visitId = request.nextUrl.searchParams.get('visitId') || undefined;
    const [medicines, employees, prescriptions] = await Promise.all([
      prisma.medicine.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
      prisma.employee.findMany({ where: { id: session.employeeId }, select: { id: true, fullName: true } }),
      prisma.prescription.findMany({ where: { employeeId: session.employeeId, ...(visitId ? { visitId } : {}) }, include: { employee: true, items: { include: { medicine: true } } }, orderBy: { id: 'desc' }, take: 30 }),
    ]);
    return NextResponse.json({ data: { medicines, employees, prescriptions } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải dữ liệu kê đơn.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDoctorSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
    const body = await request.json();
    if (!body.visitId || !body.employeeId || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Thiếu lượt khám, bác sĩ hoặc thuốc.' }, { status: 400 });
    const prescription = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id: body.visitId } });
      if (!visit) throw new Error('Không tìm thấy lượt khám.');
      return tx.prescription.create({ data: { visitId: body.visitId, employeeId: session.employeeId, status: 'DRAFT', items: { create: body.items.map((item: any) => ({ medicineId: item.medicineId, quantity: Number(item.quantity), dosage: String(item.dosage || '') })) } }, include: { employee: true, items: { include: { medicine: true } } } });
    });
    return NextResponse.json({ data: prescription }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tạo đơn thuốc.' }, { status: 400 }); }
}
