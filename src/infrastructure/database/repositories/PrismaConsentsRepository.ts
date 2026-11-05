import type { DoctorConsentFilters } from '@/features/consents/schemas/consents.schema';
import type { AssignedConsentRecord, IConsentsRepository } from '@/server/repositories/IConsentsRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma } from '@prisma/client';

const READ_CAP = 500;

export class PrismaConsentsRepository implements IConsentsRepository {
  async findById(_id: string) { return null; }
  async findMany() { return []; }
  async create(_input: unknown): Promise<never> { throw new Error('Consent writes are not implemented.'); }
  async update(_id: string, _input: unknown): Promise<never> { throw new Error('Consent writes are not implemented.'); }

  async findManyForAssignedEmployee(
    actor: { accountId: string; employeeId: string; sessionId: string },
    filters: DoctorConsentFilters,
  ): Promise<{ items: AssignedConsentRecord[]; capped: boolean }> {
    const now = new Date();
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: actor.sessionId,
        accountId: actor.accountId,
        revokedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
        account: {
          is: {
            status: 'ACTIVE',
            employee: { is: { id: actor.employeeId } },
            roles: { some: { role: { is: { permissions: { some: { permission: { is: { code: 'EMR_READ' } } } } } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!session) return { items: [], capped: false };

    const query = filters.q.trim();
    const where: Prisma.SignedConsentWhereInput = {
      visit: { is: { employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } } } },
      ...(filters.patientId ? { visit: { is: { employeeId: actor.employeeId, employee: { is: { accountId: actor.accountId } }, patientId: filters.patientId } } } : {}),
      ...(filters.visitId ? { visitId: filters.visitId } : {}),
      ...(filters.planId ? { treatmentPlanId: filters.planId } : {}),
      ...(filters.templateId ? { templateId: filters.templateId } : {}),
      ...(filters.from || filters.to ? {
        signedAt: {
          ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
          ...(filters.to ? { lt: new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) } : {}),
        },
      } : {}),
      ...(query ? {
        OR: [
          { signerName: { contains: query, mode: 'insensitive' } },
          {
            visit: {
              is: {
                patient: {
                  is: { fullName: { contains: query, mode: 'insensitive' } },
                },
              },
            },
          },
          {
            visit: {
              is: {
                patient: {
                  is: { patientCode: { contains: query, mode: 'insensitive' } },
                },
              },
            },
          },
          { template: { is: { name: { contains: query, mode: 'insensitive' } } } },
          { plan: { is: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      } : {}),
    };

    const records = await prisma.signedConsent.findMany({
      where,
      select: {
        id: true,
        visitId: true,
        treatmentPlanId: true,
        planVersion: true,
        signerName: true,
        signedAt: true,
        createdAt: true,
        template: { select: { id: true, name: true, version: true, content: true } },
        visit: { select: { id: true, visitDate: true, patientId: true, employeeId: true, patient: { select: { id: true, patientCode: true, fullName: true } } } },
        plan: { select: { id: true, name: true, visitId: true, patientId: true } },
        patient: { select: { id: true, fullName: true } },
        employee: { select: { fullName: true } },
      },
      orderBy: [{ signedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: READ_CAP,
    });

    const consistent = records.filter((record) =>
      record.visit.employeeId === actor.employeeId &&
      (!record.plan || (record.plan.visitId === record.visitId && record.plan.patientId === record.visit.patientId)) &&
      (!record.patient || record.patient.id === record.visit.patient.id),
    );

    return { items: consistent, capped: records.length === READ_CAP };
  }
}
