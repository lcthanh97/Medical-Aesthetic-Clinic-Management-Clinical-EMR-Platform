import { NextResponse } from 'next/server';
import { clinicalServicesController } from '@/server/common/container';

export async function GET() {
  const result = await clinicalServicesController.getCatalog();
  return NextResponse.json(result.body, { status: result.status });
}

