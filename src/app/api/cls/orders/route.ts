import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';
import { getDoctorSession } from '@/server/auth/doctor-session';

export async function POST(req: NextRequest) {
  try {
    if (!await getDoctorSession()) return NextResponse.json({ success: false, message: 'Chưa đăng nhập bác sĩ.' }, { status: 401 });
    const body = await req.json();
    const result = await clinicalServicesController.createOrder(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu tạo chỉ định CLS' },
      { status: 500 }
    );
  }
}
