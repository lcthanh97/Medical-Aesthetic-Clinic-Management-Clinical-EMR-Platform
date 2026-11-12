import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { getInventoryActor } from '@/server/policies/InventoryAccess';

const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function response(success: boolean, status: number, error?: string) {
  return NextResponse.json(
    { success, ...(error ? { error } : {}), ...(success ? { data: { status: 'ISSUED' } } : {}) },
    { status, headers: noStore },
  );
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
    ?? request.headers.get('host')?.split(',')[0].trim();
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? request.nextUrl.protocol.replace(':', '');
  if (!origin || !host || !['http', 'https'].includes(protocol)) return false;
  try { return new URL(origin).origin.toLowerCase() === new URL(`${protocol}://${host}`).origin.toLowerCase(); }
  catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return response(false, 403, 'Yêu cầu không hợp lệ.');
  const actor = await getInventoryActor(request.cookies.get('clinic_session')?.value);
  if (!actor) return response(false, 401, 'Vui lòng đăng nhập lại.');
  const canIssue = actor.rolePermissions.some(({ permissionCodes }) =>
    permissionCodes.includes('PRESCRIPTION_READ') && permissionCodes.includes('PRESCRIPTION_WRITE'),
  );
  if (!actor.employeeId || !canIssue) {
    return response(false, 403, 'Tài khoản không có quyền phát hành đơn thuốc.');
  }

  let body: unknown;
  try { body = await request.json(); } catch { return response(false, 400, 'Dữ liệu yêu cầu không hợp lệ.'); }
  const prescriptionId = body && typeof body === 'object' && 'prescriptionId' in body && typeof body.prescriptionId === 'string'
    ? body.prescriptionId.trim()
    : '';
  if (!prescriptionId || prescriptionId.length > 100) return response(false, 400, 'Mã đơn thuốc không hợp lệ.');

  try {
    await prisma.$transaction(async (tx) => {
      const [prescription] = await tx.$queryRaw<Array<{ id: string; status: string; employeeId: string; visitEmployeeId: string | null }>>`
        SELECT p.id, p.status, p."employeeId", v."employeeId" AS "visitEmployeeId"
        FROM "Prescription" p
        JOIN "Visit" v ON v.id = p."visitId"
        WHERE p.id = ${prescriptionId}
        FOR UPDATE OF p
      `;
      if (!prescription || prescription.employeeId !== actor.employeeId || prescription.visitEmployeeId !== actor.employeeId) {
        throw new Error('PRESCRIPTION_FORBIDDEN');
      }
      if (prescription.status !== 'DRAFT') throw new Error('PRESCRIPTION_NOT_DRAFT');

      const requested = await tx.$queryRaw<Array<{ medicineId: string; quantity: string; valid: boolean }>>`
        SELECT "medicineId", sum(quantity)::text AS quantity, bool_and(quantity > 0) AS valid
        FROM "PrescriptionItem"
        WHERE "prescriptionId" = ${prescriptionId}
        GROUP BY "medicineId"
        ORDER BY "medicineId"
      `;
      if (requested.length === 0) throw new Error('PRESCRIPTION_EMPTY');
      if (requested.some((item) => !item.valid)) throw new Error('PRESCRIPTION_INVALID_QUANTITY');

      for (const item of requested) {
        const [medicine] = await tx.$queryRaw<Array<{ id: string; name: string; unit: string; stock: string; status: string }>>`
          SELECT id, name, unit, stock::text AS stock, status
          FROM "Medicine"
          WHERE id = ${item.medicineId}
          FOR UPDATE
        `;
        if (!medicine || medicine.status !== 'ACTIVE') throw new Error('PRESCRIPTION_MEDICINE_UNAVAILABLE');
        const [updated] = await tx.$queryRaw<Array<{ balanceAfter: string }>>`
          UPDATE "Medicine"
          SET stock = stock - ${item.quantity}::numeric, "updatedAt" = now()
          WHERE id = ${item.medicineId} AND stock >= ${item.quantity}::numeric
          RETURNING stock::text AS "balanceAfter"
        `;
        if (!updated) throw new Error(`PRESCRIPTION_INSUFFICIENT_STOCK:${medicine.name}:${medicine.stock}:${item.quantity}`);

        await tx.$executeRaw`
          INSERT INTO "InventoryTransaction" (
            id, "medicineId", "supplyId", "transactionType", quantity, unit,
            "referenceType", "referenceId", "balanceBefore", "balanceAfter",
            "createdById", notes, "createdAt"
          ) VALUES (
            ${randomUUID()}, ${medicine.id}, NULL, 'PRESCRIPTION_ISSUE', ${item.quantity}::numeric,
            ${medicine.unit}, 'PRESCRIPTION', ${prescriptionId}, ${medicine.stock}::numeric,
            ${updated.balanceAfter}::numeric, ${actor.employeeId}, ${`Xuất kho theo đơn thuốc ${prescriptionId}`}, now()
          )
        `;
      }

      await tx.$executeRaw`UPDATE "Prescription" SET status = 'ISSUED' WHERE id = ${prescriptionId}`;
    }, { maxWait: 15_000, timeout: 30_000, isolationLevel: 'Serializable' });
    revalidatePath('/admin/inventory');
    return response(true, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'PRESCRIPTION_FORBIDDEN') return response(false, 404, 'Không tìm thấy đơn thuốc trong phạm vi được phân công.');
    if (message === 'PRESCRIPTION_NOT_DRAFT') return response(false, 409, 'Đơn thuốc đã phát hành hoặc không còn ở trạng thái nháp.');
    if (message === 'PRESCRIPTION_EMPTY') return response(false, 400, 'Đơn thuốc chưa có thuốc để phát hành.');
    if (message === 'PRESCRIPTION_INVALID_QUANTITY') return response(false, 409, 'Đơn thuốc có số lượng thuốc không hợp lệ.');
    if (message === 'PRESCRIPTION_MEDICINE_UNAVAILABLE') return response(false, 409, 'Có thuốc đã ngừng hoạt động hoặc không còn tồn tại.');
    if (message.startsWith('PRESCRIPTION_INSUFFICIENT_STOCK:')) {
      const [, name, available, requested] = message.split(':');
      return response(false, 409, `Không đủ tồn kho ${name}: còn ${available}, đơn cần ${requested}.`);
    }
    console.error('[prescriptions] atomic issue failed', error);
    return response(false, 500, 'Không thể phát hành đơn thuốc lúc này.');
  }
}
