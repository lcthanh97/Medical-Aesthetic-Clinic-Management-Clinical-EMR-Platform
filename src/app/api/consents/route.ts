import { NextRequest, NextResponse } from 'next/server';
import { consentsController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitId = searchParams.get('visitId');

  const result = await consentsController.getSignedConsents(visitId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await consentsController.signConsent(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý ký cam kết điện tử' },
      { status: 500 }
    );
  }
}
