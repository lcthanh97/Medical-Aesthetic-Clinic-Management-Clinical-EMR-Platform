import { getStaffSession } from '@/server/auth/staff-session';
import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function POST(req: NextRequest) {
  if (!await getStaffSession('letan')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await billingController.createVNPayPayment(body, clientIp);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi khởi tạo cổng VNPay Sandbox' },
      { status: 500 }
    );
  }
}

