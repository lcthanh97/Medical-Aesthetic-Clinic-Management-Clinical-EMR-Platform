import { NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';
import { getDoctorSession } from '@/server/auth/doctor-session';

export async function GET() {
  if (!await getDoctorSession()) return NextResponse.json({ success: false, message: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
  const result = await clinicalServicesController.getCatalog();
  return NextResponse.json(result.body, { status: result.status });
}

