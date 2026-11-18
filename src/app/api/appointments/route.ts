import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/server/auth/staff-session';
import { PrismaAppointmentsRepository } from '@/infrastructure/database/repositories/PrismaAppointmentsRepository';
import { AppointmentsService } from '@/server/services/AppointmentsService';
import prisma from '@/infrastructure/database/prisma';

const service = new AppointmentsService(new PrismaAppointmentsRepository());

async function allowed() {
  return Boolean(await getStaffSession('letan') || await getStaffSession('admin'));
}

export async function GET() {
  if (!await allowed()) return NextResponse.json({ success: false }, { status: 401 });
  const data = await prisma.appointment.findMany({
    include: { patient: true, room: true, employee: true, service: true },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  if (!await allowed()) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const body = await req.json();
    const data = await service.create({
      patientId: body.patientId, roomId: body.roomId || null, employeeId: body.employeeId || null,
      serviceId: body.serviceId || null, scheduledAt: new Date(body.scheduledAt), status: body.status || 'SCHEDULED',
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Không thể tạo lịch hẹn.' }, { status: 400 });
  }
}
