import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/server/common/container';
import { AuditValidator } from '@/server/validators/AuditValidator';

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const filters = AuditValidator.validateFilters({ query: p.get('query') || undefined, entity: p.get('entity') || undefined,
      accountId: p.get('accountId') || undefined, from: p.get('from') || undefined, to: p.get('to') || undefined,
      page: p.get('page') || 1, pageSize: p.get('pageSize') || 20 });
    const data = await auditService.getList(filters);
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải nhật ký.' }, { status: 500 }); }
}
