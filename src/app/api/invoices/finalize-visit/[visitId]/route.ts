import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function POST(req: NextRequest, props: RouteProps) {
  const { visitId } = await props.params;
  const result = await billingController.finalizeVisitInvoice(visitId);
  return NextResponse.json(result.body, { status: result.status });
}

