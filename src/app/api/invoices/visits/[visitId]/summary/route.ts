import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { visitId } = await props.params;
  const result = await billingController.getVisitBillingSummary(visitId);
  return NextResponse.json(result.body, { status: result.status });
}

