import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ paymentId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { paymentId } = await props.params;
  const result = await billingController.getInvoice(paymentId);
  return NextResponse.json(result.body, { status: result.status });
}
