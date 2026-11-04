import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await billingController.confirmCashPayment(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xác nhận thanh toán tiền mặt' },
      { status: 500 }
    );
  }
}
