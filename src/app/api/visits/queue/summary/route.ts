import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || undefined;

  const result = await visitsController.getQueueSummary(date);
  return NextResponse.json(result.body, { status: result.status });
}

