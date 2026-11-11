'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { AuthorizationService } from '@/server/policies/AuthorizationService';
import { isDoctorEmrReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';
import { AuthService } from '@/server/services/AuthService';

const auth = new AuthService(new PrismaAuthRepository());
const authorization = new AuthorizationService();

async function actorForWrite() {
  if (!isDoctorEmrReadEnvironment()) return null;
  const actor = await auth.getSession((await cookies()).get('clinic_session')?.value);
  return actor?.employeeId && authorization.hasPermission(actor, 'EMR_WRITE') ? actor : null;
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function lockAssignedActiveVisit(tx: Prisma.TransactionClient, visitId: string, actor: NonNullable<Awaited<ReturnType<typeof actorForWrite>>>) {
  const now = new Date();
  const session = await tx.refreshToken.findFirst({ where: { id: actor.sessionId, accountId: actor.accountId, revokedAt: null, expiresAt: { gt: now } }, select: { id: true } });
  if (!session) throw new Error('AUTH_REQUIRED');
  await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Visit" WHERE "id" = ${visitId} FOR UPDATE`;
  const visit = await tx.visit.findFirst({
    where: { id: visitId, employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } }, status: { in: ['IN_PROGRESS', 'EXAMINING'] } },
    select: { id: true },
  });
  if (!visit) throw new Error('VISIT_SCOPE_OR_STATE_DENIED');
}

function errorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'AUTH_REQUIRED') return 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.';
  if (code === 'VISIT_SCOPE_OR_STATE_DENIED') return 'Chỉ bác sĩ được phân công mới có thể thao tác trên Visit đang khám.';
  if (code === 'ORDER_NOT_FOUND') return 'Không tìm thấy chỉ định trong Visit được phân công.';
  return 'Không thể lưu chỉ định hoặc kết quả cận lâm sàng.';
}

function revalidate(visitId: string) {
  revalidatePath('/bacsi/examination');
  revalidatePath('/bacsi/emr');
  revalidatePath(`/bacsi/examination?visitId=${encodeURIComponent(visitId)}`);
}

export async function saveDoctorClinicalOrder(input: { visitId: string; orderId?: string; category: 'LAB' | 'IMAGING'; title: string }) {
  const actor = await actorForWrite();
  if (!actor) return { success: false as const, error: 'Tài khoản chưa có quyền ghi chỉ định hoặc phiên làm việc không hợp lệ.' };
  const visitId = clean(input?.visitId, 100);
  const orderId = clean(input?.orderId, 100);
  const title = clean(input?.title, 180);
  if (!visitId || !title || !['LAB', 'IMAGING'].includes(input?.category)) return { success: false as const, error: 'Vui lòng nhập loại và tên chỉ định hợp lệ.' };
  try {
    const savedId = await prisma.$transaction(async (tx) => {
      await lockAssignedActiveVisit(tx, visitId, actor);
      const type = `${input.category}:${title}`;
      if (orderId) {
        const existing = await tx.clinicalOrder.findFirst({ where: { id: orderId, visitId, visit: { is: { employeeId: actor.employeeId } } }, select: { id: true, type: true } });
        if (!existing) throw new Error('ORDER_NOT_FOUND');
        const existingCategory = existing.type.startsWith('IMAGING:') ? 'IMAGING' : 'LAB';
        if (existingCategory !== input.category) throw new Error('ORDER_NOT_FOUND');
        await tx.clinicalOrder.update({ where: { id: orderId }, data: { type } });
        await tx.auditLog.create({ data: { accountId: actor.accountId, action: 'CLINICAL_ORDER_UPDATED', entity: 'ClinicalOrder', entityId: orderId } });
        return orderId;
      }
      const order = await tx.clinicalOrder.create({ data: { visitId, orderedById: actor.employeeId, type, status: 'IN_PROGRESS' }, select: { id: true } });
      await tx.auditLog.create({ data: { accountId: actor.accountId, action: 'CLINICAL_ORDER_CREATED', entity: 'ClinicalOrder', entityId: order.id } });
      return order.id;
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    revalidate(visitId);
    return { success: true as const, id: savedId };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function saveDoctorClinicalResult(input: { orderId: string; resultId?: string; label: string; result: string; unit?: string }) {
  const actor = await actorForWrite();
  if (!actor) return { success: false as const, error: 'Tài khoản chưa có quyền ghi kết quả hoặc phiên làm việc không hợp lệ.' };
  const orderId = clean(input?.orderId, 100);
  const resultId = clean(input?.resultId, 100);
  const label = clean(input?.label, 180);
  const result = clean(input?.result, 10_000);
  const unit = clean(input?.unit, 80) || null;
  if (!orderId || !label || !result) return { success: false as const, error: 'Vui lòng nhập tên xét nghiệm/loại hình ảnh và kết quả.' };
  try {
    const visitId = await prisma.$transaction(async (tx) => {
      const order = await tx.clinicalOrder.findFirst({
        where: { id: orderId, visit: { is: { employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } } } },
        select: { id: true, type: true, visitId: true },
      });
      if (!order) throw new Error('ORDER_NOT_FOUND');
      await lockAssignedActiveVisit(tx, order.visitId, actor);
      if (order.type.startsWith('IMAGING:')) {
        if (resultId) {
          const existing = await tx.imagingResult.findFirst({ where: { id: resultId, orderId }, select: { id: true } });
          if (!existing) throw new Error('ORDER_NOT_FOUND');
          await tx.imagingResult.update({ where: { id: resultId }, data: { imagingType: label, conclusion: result } });
        } else {
          await tx.imagingResult.create({ data: { orderId, imagingType: label, conclusion: result } });
        }
      } else if (resultId) {
        const existing = await tx.labResult.findFirst({ where: { id: resultId, orderId }, select: { id: true } });
        if (!existing) throw new Error('ORDER_NOT_FOUND');
        await tx.labResult.update({ where: { id: resultId }, data: { testName: label, result, unit } });
      } else {
        await tx.labResult.create({ data: { orderId, testName: label, result, unit } });
      }
      await tx.clinicalOrder.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
      await tx.auditLog.create({ data: { accountId: actor.accountId, action: resultId ? 'CLINICAL_RESULT_UPDATED' : 'CLINICAL_RESULT_CREATED', entity: 'ClinicalOrder', entityId: orderId } });
      return order.visitId;
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 15_000 });
    revalidate(visitId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
