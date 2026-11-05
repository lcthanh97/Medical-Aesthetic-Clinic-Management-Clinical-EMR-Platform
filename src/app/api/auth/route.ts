import { NextRequest, NextResponse } from 'next/server';
import { authService, auditService } from '@/server/common/container';
import { AuthValidator } from '@/server/validators/AuthValidator';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query') || undefined;
    const [accounts, roles] = await Promise.all([authService.getList(query), authService.getRoles()]);
    return NextResponse.json({ data: accounts, roles });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải tài khoản.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = AuthValidator.validateCreate(await request.json()); const account = await authService.create(body);
    await auditService.record({ action: 'CREATE_ACCOUNT', entity: 'Account', entityId: account.id, ipAddress: request.headers.get('x-forwarded-for') || undefined });
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error: any) {
    const conflict = error?.code === 'P2002';
    return NextResponse.json({ error: conflict ? 'Tên đăng nhập hoặc email đã tồn tại.' : error?.message || 'Không thể tạo tài khoản.' }, { status: conflict ? 409 : 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = AuthValidator.validateUpdate(await request.json());
    const account = await authService.update(body.id, body);
    await auditService.record({ action: `UPDATE_ACCOUNT:${body.status || 'PROFILE'}`, entity: 'Account', entityId: account.id, ipAddress: request.headers.get('x-forwarded-for') || undefined });
    return NextResponse.json({ data: account });
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Không thể cập nhật tài khoản.' }, { status: 400 }); }
}
