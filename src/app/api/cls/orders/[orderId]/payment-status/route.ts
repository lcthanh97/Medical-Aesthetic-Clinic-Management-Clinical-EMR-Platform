import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { orderId } = await props.params;
  const result = await clinicalServicesController.getPaymentStatus(orderId);
  return NextResponse.json(result.body, { status: result.status });
}
