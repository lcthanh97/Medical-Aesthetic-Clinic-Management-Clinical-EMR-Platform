import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function PATCH(req: NextRequest, props: RouteProps) {
  try {
    const { visitId } = await props.params;
    const body = await req.json();
    const result = await visitsController.transferRoom(visitId, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý điều chuyển phòng' },
      { status: 500 }
    );
  }
}

