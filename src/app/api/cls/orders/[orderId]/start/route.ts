import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function POST(req: NextRequest, props: RouteProps) {
  try {
    const { orderId } = await props.params;
    const result = await clinicalServicesController.startExecution(orderId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi bắt đầu thực hiện cận lâm sàng' },
      { status: 500 }
    );
  }
}
