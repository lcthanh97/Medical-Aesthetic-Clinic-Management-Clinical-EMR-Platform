import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';
import { getStaffSession } from '@/server/auth/staff-session';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function POST(_req: NextRequest, props: RouteProps) {
  const actor = await getStaffSession('letan');
  if (!actor) return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập thu ngân.' }, { status: 401 });
  const { visitId } = await props.params;
  const result = await billingController.finalizeVisitInvoice(visitId, actor.accountId);
  return NextResponse.json(result.body, { status: result.status });
}

