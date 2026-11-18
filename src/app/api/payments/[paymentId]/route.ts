import { getStaffSession } from '@/server/auth/staff-session';
import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ paymentId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  if (!await getStaffSession('letan') && !await getStaffSession('admin')) {
    return Response.json({ success: false, message: 'Yêu cầu đăng nhập nhân viên.' }, { status: 401 });
  }
  const { paymentId } = await props.params;
  const result = await billingController.getInvoice(paymentId);
  return NextResponse.json(result.body, { status: result.status });
}
