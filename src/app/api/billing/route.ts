import { NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function GET() {
  const result = await billingController.getList();
  return NextResponse.json(result.body, { status: result.status });
}
