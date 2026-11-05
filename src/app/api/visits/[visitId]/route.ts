import { NextRequest, NextResponse } from 'next/server';
import { visitsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ visitId: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { visitId } = await props.params;
  const result = await visitsController.getById(visitId);
  return NextResponse.json(result.body, { status: result.status });
}

