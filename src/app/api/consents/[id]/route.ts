import { NextRequest, NextResponse } from 'next/server';
import { consentsController } from '@/server/common/container';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const result = await consentsController.getSignedConsentById(id);
  return NextResponse.json(result.body, { status: result.status });
}

