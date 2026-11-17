import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { PrismaFollowUpRepository } from '@/infrastructure/database/repositories/PrismaFollowUpRepository';
import { FollowUpService } from '@/server/services/FollowUpService';
import type { FollowUpActor } from '@/server/repositories/IFollowUpRepository';

export const followUpService = new FollowUpService(new PrismaFollowUpRepository());

export function followUpJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function followUpActor(_request: NextRequest): Promise<FollowUpActor | null> {
  const session = await getDoctorSession();
  if (!session) return null;
  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  if (!account || !account.roles.some(({ role }) => {
    const name = role.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return name.includes('bac si') || name.includes('doctor');
  })) return null;
  return { accountId: session.accountId, employeeId: session.employeeId };
}

export function followUpSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
    ?? request.headers.get('host')?.split(',')[0].trim();
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? request.nextUrl.protocol.replace(':', '');
  if (!origin || !host || !['http', 'https'].includes(protocol)) return false;
  try { return new URL(origin).origin.toLowerCase() === new URL(`${protocol}://${host}`).origin.toLowerCase(); }
  catch { return false; }
}

const errors: Record<string, { status: number; message: string }> = {
  FOLLOWUP_ACCESS_DENIED: { status: 403, message: 'Bạn không có quyền thao tác kế hoạch tái khám trong phạm vi được phép.' },
  FOLLOWUP_VISIT_NOT_FOUND: { status: 404, message: 'Không tìm thấy lượt khám được phân công cho tài khoản này.' },
  FOLLOWUP_VISIT_FORBIDDEN: { status: 403, message: 'Bạn không được phân công lượt khám này.' },
  FOLLOWUP_PLAN_NOT_FOUND: { status: 404, message: 'Lượt khám chưa có kế hoạch tái khám.' },
  FOLLOWUP_CANCELLED: { status: 409, message: 'Kế hoạch đã hủy không thể xác nhận lại.' },
  FOLLOWUP_ALREADY_CONFIRMED: { status: 409, message: 'Kế hoạch đã được xác nhận. Hãy lưu thay đổi thành nháp trước khi xác nhận lại.' },
  FOLLOWUP_NOT_CANCELLABLE: { status: 409, message: 'Chỉ kế hoạch nháp hoặc đã xác nhận mới có thể hủy.' },
  FOLLOWUP_TARGET_DATE_REQUIRED: { status: 400, message: 'Vui lòng chọn ngày tái khám.' },
  FOLLOWUP_TARGET_DATE_PAST: { status: 400, message: 'Ngày tái khám phải từ hôm nay trở đi.' },
  FOLLOWUP_REASON_REQUIRED: { status: 400, message: 'Vui lòng ghi lý do tái khám.' },
  FOLLOWUP_CONFIRM_CONTENT_REQUIRED: { status: 400, message: 'Để xác nhận, hãy nhập hướng dẫn chăm sóc, dấu hiệu cần đến sớm, hoặc chọn “Không cần” và ghi chú lý do.' },
  FOLLOWUP_TEMPLATE_NOT_FOUND: { status: 404, message: 'Không tìm thấy mẫu hướng dẫn đang hoạt động trong phạm vi được phép.' },
  FOLLOWUP_DECISION_REQUIRED: { status: 409, message: 'Cần xác nhận quyết định tái khám trước khi hoàn tất lượt khám.' },
};

export function followUpError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') return followUpJson({ success: false, code: 'FOLLOWUP_REFERENCE_INVALID', error: 'Thông tin liên kết không còn tồn tại. Vui lòng tải lại lượt khám.' }, 409);
  if (error instanceof SyntaxError) return followUpJson({ success: false, code: 'VALIDATION_FAILED', error: 'Nội dung JSON không hợp lệ.' }, 400);
  if (error && typeof error === 'object' && 'issues' in error) return followUpJson({ success: false, code: 'VALIDATION_FAILED', error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.' }, 400);
  const code = error instanceof Error ? error.message : '';
  const mapped = errors[code];
  if (mapped) return followUpJson({ success: false, code, error: mapped.message }, mapped.status);
  return followUpJson({ success: false, code: 'FOLLOWUP_REQUEST_FAILED', error: 'Không thể xử lý yêu cầu tái khám lúc này.' }, 500);
}

export function unauthenticated() {
  return followUpJson({ success: false, code: 'AUTH_REQUIRED', error: 'Vui lòng đăng nhập để tiếp tục.' }, 401);
}
