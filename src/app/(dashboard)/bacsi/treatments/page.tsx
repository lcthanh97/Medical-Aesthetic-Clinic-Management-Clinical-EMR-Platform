import { ChevronDown, ShieldCheck } from 'lucide-react';
import { EquipmentUsagePanel } from '@/features/treatments/components/EquipmentUsagePanel';
import { InteractionRuleEnginePanel } from '@/features/treatments/components/InteractionRuleEnginePanel';
import { TreatmentPlanWorkspace } from '@/features/treatments/components/TreatmentPlanWorkspace';
import { TreatmentsPanel } from '@/features/treatments/components/TreatmentsPanel';
import { prisma } from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

export const dynamic = 'force-dynamic';

export default async function BacSiTreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) return null;

  const { visitId: requestedVisitId } = await searchParams;
  const visits = await prisma.visit.findMany({
    where: { employeeId: session.employeeId },
    include: { patient: true, employee: { select: { fullName: true } } },
    orderBy: { visitDate: 'desc' },
    take: 50,
  });

  const currentVisitId = visits.some((visit) => visit.id === requestedVisitId)
    ? requestedVisitId!
    : visits[0]?.id ?? '';
  const currentVisit = visits.find((visit) => visit.id === currentVisitId);

  const [plans, employees, equipments, usages] = currentVisitId
    ? await Promise.all([
        prisma.treatmentPlan.findMany({
          where: { visitId: currentVisitId },
          include: {
            createdBy: { select: { fullName: true } },
            protocolTemplate: { select: { code: true, version: true } },
            consents: { select: { planVersion: true, signedAt: true } },
            stages: {
              include: {
                steps: { orderBy: { orderNo: 'asc' } },
                sessions: {
                  include: {
                    performedBy: { select: { fullName: true } },
                    step: { select: { orderNo: true } },
                  },
                  orderBy: { sessionNo: 'asc' },
                },
              },
              orderBy: { orderNo: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.employee.findMany({
          where: { id: session.employeeId },
          orderBy: { fullName: 'asc' },
        }),
        prisma.equipment.findMany({ orderBy: { name: 'asc' } }),
        prisma.equipmentUsage.findMany({
          where: { visitId: currentVisitId },
          include: { equipment: true },
          orderBy: { startedAt: 'desc' },
        }),
      ])
    : [[], [], [], []];

  const managementPlans = plans.map(({ consents: _consents, protocolTemplate: _template, createdBy: _createdBy, ...plan }) => ({
    ...plan,
    stages: plan.stages.map(({ sessions: _sessions, ...stage }) => stage),
  }));

  const viewVisits = visits.map((visit) => ({
    id: visit.id,
    visitDate: visit.visitDate,
    employee: visit.employee,
    patient: {
      id: visit.patient.id,
      patientCode: visit.patient.patientCode,
      fullName: visit.patient.fullName,
      dateOfBirth: visit.patient.dateOfBirth,
      phone: visit.patient.phone,
    },
  }));

  return (
    <div className="space-y-4">
      <TreatmentPlanWorkspace
        visits={viewVisits}
        currentVisitId={currentVisitId}
        plans={plans}
        doctorName={session.fullName}
      />

      {currentVisitId && <details id="plan-management" className="group rounded-lg border border-[#dfe7f0] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-bold text-[#314c6b] marker:hidden">
          <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#4f78aa]" /> Quản lý bước phác đồ, tiêu hao và thiết bị</span>
          <ChevronDown size={15} className="transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-[#e5ebf3] p-4">
          <InteractionRuleEnginePanel visitId={currentVisitId} />
          <TreatmentsPanel initialPlans={managementPlans} visitId={currentVisitId} employees={employees} />
          <EquipmentUsagePanel initialUsages={usages} visitId={currentVisitId} equipments={equipments} />
        </div>
      </details>}
      {!currentVisit && <p className="px-1 text-[10px] text-[#8191a6]">Hiển thị lượt khám được phân công cho {session.fullName}.</p>}
    </div>
  );
}
