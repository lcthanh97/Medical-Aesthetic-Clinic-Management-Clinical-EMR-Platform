import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';
import { getDoctorSession } from '@/server/auth/doctor-session';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function POST(req: NextRequest, props: RouteProps) {
  try {
    if (!await getDoctorSession()) return NextResponse.json({ success: false, message: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
    const { orderId } = await props.params;
    const result = await clinicalServicesController.startExecution(orderId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi bắt đầu thực hiện cận lâm sàng' },
      { status: 500 }
    );
  }
}
