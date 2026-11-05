import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/server/common/container';

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const data = await auditService.getList({ query: p.get('query') || undefined, entity: p.get('entity') || undefined,
      accountId: p.get('accountId') || undefined, from: p.get('from') || undefined, to: p.get('to') || undefined,
      page: Number(p.get('page') || 1), pageSize: Number(p.get('pageSize') || 20) });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải nhật ký.' }, { status: 500 }); }
}
