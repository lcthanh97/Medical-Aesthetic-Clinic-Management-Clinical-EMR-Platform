'use server';

import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
import type { Prisma } from '@prisma/client';
import { isStoredClinicalObject, isStoredTreatmentImage } from '@/server/storage/neon-object-storage';

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

const profileInclude = {
  allergies: { orderBy: { substance: 'asc' } },
  histories: { orderBy: [{ diagnosisDate: 'desc' }, { type: 'asc' }] },
  visits: {
    orderBy: { visitDate: 'desc' },
    take: 50,
    include: {
      employee: { select: { fullName: true } },
      room: { select: { name: true, department: { select: { name: true } } } },
      medicalRecord: { select: { preliminaryDiagnosis: true, finalDiagnosis: true, notes: true } },
      orders: {
        orderBy: { orderedAt: 'desc' },
        include: {
          service: { select: { code: true, name: true } },
          labResults: { select: { id: true, testName: true, result: true, unit: true } },
          imagingResults: { select: { id: true, imagingType: true, conclusion: true, fileUrl: true } },
        },
      },
      prescriptions: { include: { items: { include: { medicine: { select: { name: true, unit: true } } } } } },
      treatmentImages: {
        orderBy: { capturedAt: 'desc' },
        select: { id: true, imageUrl: true, imageType: true, phase: true, bodyArea: true, description: true, capturedAt: true },
      },
      consents: { include: { template: { select: { name: true, version: true } } } },
    },
  },
  treatmentPlans: {
    orderBy: { updatedAt: 'desc' },
    include: {
      protocolTemplate: { select: { code: true, name: true } },
      stages: {
        orderBy: { orderNo: 'asc' },
        include: {
          sessions: {
            orderBy: { sessionNo: 'asc' },
            select: { id: true, sessionNo: true, status: true, scheduledAt: true, completedAt: true },
          },
        },
      },
    },
  },
} satisfies Prisma.PatientInclude;

export async function getDoctorPatientWorkspace(requestedPatientId?: string) {
  const session = await getDoctorSession();
  if (!session) return { success: false as const, error: 'Phiên bác sĩ không hợp lệ.' };

  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  if (!account || !account.roles.some(({ role }) => isDoctorRole(role.name))) {
    return { success: false as const, error: 'Tài khoản không có quyền truy cập hồ sơ bác sĩ.' };
  }

  const assignedVisits = await prisma.visit.findMany({
    where: { employeeId: session.employeeId },
    select: {
      id: true, patientId: true, visitDate: true, status: true,
      patient: { select: { id: true, fullName: true, patientCode: true } },
    },
    orderBy: { visitDate: 'desc' },
    take: 300,
  });
  const patients = [...new Map(assignedVisits.map((visit) => [visit.patientId, {
    id: visit.patient.id,
    fullName: visit.patient.fullName,
    patientCode: visit.patient.patientCode,
    latestVisitId: visit.id,
  }])).values()];
  if (patients.length === 0) return { success: true as const, patients, data: null, selectedVisitId: '' };

  const patientId = patients.some((patient) => patient.id === requestedPatientId) ? requestedPatientId! : patients[0].id;
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, visits: { some: { employeeId: session.employeeId } } },
    include: {
      ...profileInclude,
      visits: { ...profileInclude.visits, where: { employeeId: session.employeeId } },
      treatmentPlans: { ...profileInclude.treatmentPlans, where: { visit: { employeeId: session.employeeId } } },
    },
  });
  if (!patient) return { success: false as const, error: 'Không tìm thấy hồ sơ trong phạm vi được phân công.' };

  const selectedVisit = patient.visits.find((visit) => ['IN_PROGRESS', 'EXAMINING', 'WAITING', 'REGISTERED', 'CHECKED_IN', 'WAITING_RESULT', 'RESULT_READY'].includes(visit.status)) ?? patient.visits[0];
  const visits = await Promise.all(patient.visits.map(async (visit) => ({
    ...visit,
    orders: visit.orders.map((order) => ({
      ...order,
      imagingResults: order.imagingResults.map((result) => ({
        ...result,
        fileUrl: result.fileUrl && isStoredClinicalObject(result.fileUrl)
          ? `/api/doctor/clinical-results/${encodeURIComponent(result.id)}/file`
          : result.fileUrl,
      })),
    })),
    treatmentImages: visit.treatmentImages.map((image) => ({
      ...image,
      imageUrl: isStoredTreatmentImage(image.imageUrl) ? `/api/doctor/treatment-images/${encodeURIComponent(image.id)}/file` : image.imageUrl,
    })),
  })));
  const data = JSON.parse(JSON.stringify({ patient: { ...patient, visits }, visits, treatmentPlans: patient.treatmentPlans }));
  return { success: true as const, patients, data, selectedVisitId: selectedVisit?.id ?? '' };
}
