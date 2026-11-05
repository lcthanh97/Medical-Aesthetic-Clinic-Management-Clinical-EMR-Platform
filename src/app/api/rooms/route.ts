import { NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

export async function GET() {
  const result = await visitsController.getRooms();
  return NextResponse.json(result.body, { status: result.status });
}

