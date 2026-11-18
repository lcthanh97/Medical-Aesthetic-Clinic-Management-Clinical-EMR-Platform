import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';
import { getStaffSession } from '@/server/auth/staff-session';

export async function POST(req: NextRequest) {
  const actor = await getStaffSession('letan');
  if (!actor) return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập thu ngân.' }, { status: 401 });
  try {
    const body = await req.json();
    const result = await billingController.confirmCashPayment(body, actor.accountId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xác nhận thanh toán tiền mặt' },
      { status: 500 }
    );
  }
}
