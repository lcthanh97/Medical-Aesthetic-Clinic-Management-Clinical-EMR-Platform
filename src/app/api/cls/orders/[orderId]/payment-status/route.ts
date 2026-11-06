import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';
import { getDoctorSession } from '@/server/auth/doctor-session';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  if (!await getDoctorSession()) return NextResponse.json({ success: false, message: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
  const { orderId } = await props.params;
  const result = await clinicalServicesController.getPaymentStatus(orderId);
  return NextResponse.json(result.body, { status: result.status });
}
