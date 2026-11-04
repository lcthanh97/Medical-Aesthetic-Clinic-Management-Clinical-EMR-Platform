import { NextRequest, NextResponse } from 'next/server';
import { consentsController } from '@/server/common/container';

export async function GET() {
  const result = await consentsController.getAllTemplates();
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await consentsController.createTemplate(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi tạo biểu mẫu cam kết' },
      { status: 500 }
    );
  }
}

