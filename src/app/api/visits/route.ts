import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await visitsController.createWalkInVisit(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu tiếp nhận' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = {
    date: searchParams.get('date') || undefined,
    roomId: searchParams.get('roomId') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  };

  const result = await visitsController.getList(query);
  return NextResponse.json(result.body, { status: result.status });
}

