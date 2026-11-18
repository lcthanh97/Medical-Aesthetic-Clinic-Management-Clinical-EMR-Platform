'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import { FollowUpService } from '@/server/services/FollowUpService';
import { PrismaFollowUpRepository } from '@/infrastructure/database/repositories/PrismaFollowUpRepository';
import { isStoredClinicalObject } from '@/server/storage/neon-object-storage';

const statuses = {
  startable: ['WAITING', 'CHECKED_IN', 'REGISTERED'],
  editable: ['IN_PROGRESS', 'EXAMINING'],
} as const;

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

async function currentDoctor() {
  const session = await getDoctorSession();
  if (!session) return null;

  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  if (!account || !account.roles.some(({ role }) => isDoctorRole(role.name))) return null;
  return { accountId: account.id, employeeId: session.employeeId };
}

function parseDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== day) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function toVisitDto(visit: {
  id: string;
  patientId: string;
  visitDate: Date;
  status: string;
  patient: { id: string; patientCode: string; fullName: string; dateOfBirth: Date | null; phone: string | null; allergies: Array<{ id: string; substance: string; reaction: string | null; severity: string | null }> };
  employee: { fullName: string } | null;
  room: { name: string; department: { name: string } } | null;
  medicalRecord: { id: string; preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null;
  orders: Array<{
    id: string; type: string; status: string; orderedAt: Date;
    service: { code: string; name: string } | null;
    labResults: Array<{ id: string; testName: string; result: string; unit: string | null }>;
    imagingResults: Array<{ id: string; imagingType: string; conclusion: string; fileUrl: string | null }>;
  }>;
  treatmentPlans: Array<{ id: string; name: string; version: number; status: string }>;
  prescriptions: Array<{
    id: string; status: string;
    items: Array<{ id: string; quantity: { toString(): string }; dosage: string; medicine: { name: string; unit: string } }>;
  }>;
}) {
  return {
    ...visit,
    visitDate: visit.visitDate.toISOString(),
    patient: { ...visit.patient, dateOfBirth: visit.patient.dateOfBirth?.toISOString() ?? null },
    orders: visit.orders.map((order) => ({
      ...order,
      orderedAt: order.orderedAt.toISOString(),
      imagingResults: order.imagingResults.map((result) => ({
        ...result,
        fileUrl: result.fileUrl && isStoredClinicalObject(result.fileUrl)
          ? `/api/doctor/clinical-results/${encodeURIComponent(result.id)}/file`
          : result.fileUrl,
      })),
    })),
    prescriptions: visit.prescriptions.map((prescription) => ({
      ...prescription,
      items: prescription.items.map((item) => ({ ...item, quantity: item.quantity.toString() })),
    })),
  };
}

const visitInclude = {
  patient: { select: {
    id: true, patientCode: true, fullName: true, dateOfBirth: true, phone: true,
    allergies: { select: { id: true, substance: true, reaction: true, severity: true } },
  } },
  employee: { select: { fullName: true } },
  room: { select: { name: true, department: { select: { name: true } } } },
  medicalRecord: { select: { id: true, preliminaryDiagnosis: true, finalDiagnosis: true, notes: true } },
  orders: { select: {
    id: true, type: true, status: true, orderedAt: true,
    service: { select: { code: true, name: true } },
    labResults: { select: { id: true, testName: true, result: true, unit: true } },
    imagingResults: { select: { id: true, imagingType: true, conclusion: true, fileUrl: true } },
  }, orderBy: { orderedAt: 'asc' } },
  prescriptions: { select: {
    id: true, status: true,
    items: { select: { id: true, quantity: true, dosage: true, medicine: { select: { name: true, unit: true } } } },
  } },
  treatmentPlans: { select: { id: true, name: true, version: true, status: true }, orderBy: { updatedAt: 'desc' } },
} as const;

const visitListInclude = {
  patient: { select: { patientCode: true, fullName: true } },
} as const;

export async function getAssignedExaminationVisits(day: string) {
  const actor = await currentDoctor();
  const range = parseDay(day);
  if (!actor || !range) return { success: false as const, error: 'Phiên bác sĩ không hợp lệ hoặc ngày xem không đúng.' };

  const visits = await prisma.visit.findMany({
    where: { employeeId: actor.employeeId, visitDate: { gte: range.start, lt: range.end } },
    include: visitListInclude,
    orderBy: { visitDate: 'asc' },
    take: 100,
  });
  return { success: true as const, data: visits.map((visit) => ({ ...visit, visitDate: visit.visitDate.toISOString() })) };
}

export async function getAssignedClinicalExamination(visitId: string, day: string) {
  const actor = await currentDoctor();
  const range = parseDay(day);
  if (!actor || !range || !visitId.trim()) return { success: false as const, error: 'Không thể xác minh quyền truy cập lượt khám.' };

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, employeeId: actor.employeeId, visitDate: { gte: range.start, lt: range.end } },
    include: visitInclude,
  });
  if (!visit) return { success: false as const, error: 'Lượt khám không tồn tại trong ngày hoặc không được phân công cho bác sĩ này.' };
  return { success: true as const, data: toVisitDto(visit) };
}

export async function startAssignedClinicalVisit(visitId: string) {
  const actor = await currentDoctor();
  if (!actor) return { success: false as const, error: 'Phiên bác sĩ không hợp lệ. Vui lòng đăng nhập lại.' };

  const result = await prisma.visit.updateMany({
    where: { id: visitId, employeeId: actor.employeeId, status: { in: [...statuses.startable] } },
    data: { status: 'IN_PROGRESS' },
  });
  if (result.count !== 1) return { success: false as const, error: 'Lượt khám không còn ở trạng thái chờ hoặc không thuộc quyền được phân công.' };
  revalidatePath('/bacsi/clinical-services');
  return { success: true as const };
}

export async function saveAssignedClinicalRecord(input: {
  visitId: string;
  preliminaryDiagnosis: string;
  finalDiagnosis: string;
  notes: string;
}) {
  const actor = await currentDoctor();
  if (!actor) return { success: false as const, error: 'Phiên bác sĩ không hợp lệ. Vui lòng đăng nhập lại.' };

  if (!input || typeof input.visitId !== 'string' || !input.visitId.trim()) {
    return { success: false as const, error: 'Thiếu mã lượt khám.' };
  }
  const fields = [input.preliminaryDiagnosis, input.finalDiagnosis, input.notes];
  if (fields.some((value) => typeof value !== 'string' || value.length > 10000)) {
    return { success: false as const, error: 'Dữ liệu bệnh án không hợp lệ hoặc vượt quá giới hạn.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: input.visitId, employeeId: actor.employeeId, status: { in: [...statuses.editable] } },
      select: { id: true },
    });
    if (!visit) return null;

    return tx.medicalRecord.upsert({
      where: { visitId: visit.id },
      create: {
        visitId: visit.id,
        preliminaryDiagnosis: input.preliminaryDiagnosis.trim() || null,
        finalDiagnosis: input.finalDiagnosis.trim() || null,
        notes: input.notes.trim() || null,
      },
      update: {
        preliminaryDiagnosis: input.preliminaryDiagnosis.trim() || null,
        finalDiagnosis: input.finalDiagnosis.trim() || null,
        notes: input.notes.trim() || null,
      },
      select: { id: true, visitId: true, preliminaryDiagnosis: true, finalDiagnosis: true, notes: true },
    });
  });

  if (!updated) return { success: false as const, error: 'Chỉ có thể lưu bệnh án khi lượt khám đang được bác sĩ này thực hiện.' };
  revalidatePath('/bacsi/clinical-services');
  return { success: true as const, data: updated };
}

export async function completeAssignedClinicalVisit(visitId: string) {
  const actor = await currentDoctor();
  if (!actor) return { success: false as const, error: 'Phiên bác sĩ không hợp lệ. Vui lòng đăng nhập lại.' };

  if (process.env.FOLLOWUP_GATE_ENABLED === 'true') {
    try { await new FollowUpService(new PrismaFollowUpRepository()).assertVisitMayComplete(actor, visitId); }
    catch (error) {
      if (error instanceof Error && error.message === 'FOLLOWUP_DECISION_REQUIRED') return { success: false as const, code: 'FOLLOWUP_DECISION_REQUIRED', error: 'Cần xác nhận quyết định tái khám trước khi hoàn tất lượt khám.' };
      if (error instanceof Error && error.message === 'FOLLOWUP_VISIT_NOT_FOUND') return { success: false as const, error: 'Không tìm thấy lượt khám này.' };
      if (error instanceof Error && error.message === 'FOLLOWUP_VISIT_FORBIDDEN') return { success: false as const, error: 'Bác sĩ không phụ trách lượt khám này.' };
      return { success: false as const, error: 'Không kiểm tra được kế hoạch tái khám. Vui lòng thử lại.' };
    }
  }

  const result = await prisma.visit.updateMany({
    where: {
      id: visitId,
      employeeId: actor.employeeId,
      status: { in: [...statuses.editable] },
      prescriptions: { some: { items: { some: {} } } },
    },
    data: { status: 'COMPLETED' },
  });
  if (result.count !== 1) {
    return { success: false as const, error: 'Chỉ hoàn tất được lượt đang khám đã có ít nhất một đơn thuốc với thuốc được kê.' };
  }
  revalidatePath('/bacsi/clinical-services');
  return { success: true as const };
}
