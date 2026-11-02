import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId') || undefined;
  const date = searchParams.get('date') || undefined;
  const status = searchParams.get('status') || undefined;

  const result = await visitsController.getQueue({ roomId, date, status });
  return NextResponse.json(result.body, { status: result.status });
}

