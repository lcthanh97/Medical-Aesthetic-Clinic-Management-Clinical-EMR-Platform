import { NextRequest, NextResponse } from 'next/server';
import { consentsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const result = await consentsController.getTemplateById(id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PUT(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  try {
    const body = await req.json();
    const result = await consentsController.updateTemplate(id, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật biểu mẫu cam kết' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  try {
    const body = await req.json();
    const result = await consentsController.createTemplateVersion(id, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi phát hành phiên bản mới cho biểu mẫu' },
      { status: 500 }
    );
  }
}
