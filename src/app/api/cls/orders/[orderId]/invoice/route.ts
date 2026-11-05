import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { orderId } = await props.params;
  const result = await clinicalServicesController.getOrderInvoice(orderId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: NextRequest, props: RouteProps) {
  try {
    const { orderId } = await props.params;
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }
    const result = await clinicalServicesController.createOrGetInvoice(orderId, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi lập hóa đơn thanh toán CLS' },
      { status: 500 }
    );
  }
}
