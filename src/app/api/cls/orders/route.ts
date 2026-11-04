import { NextRequest, NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await clinicalServicesController.createOrder(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu tạo chỉ định CLS' },
      { status: 500 }
    );
  }
}
