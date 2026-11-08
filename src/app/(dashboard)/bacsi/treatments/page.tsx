import { TreatmentsPanel } from '@/features/treatments/components/TreatmentsPanel';
import { EquipmentUsagePanel } from '@/features/treatments/components/EquipmentUsagePanel';
import { VisitSelector } from '@/features/treatments/components/VisitSelector';
import { InteractionRuleEnginePanel } from '@/features/treatments/components/InteractionRuleEnginePanel';
import { getPlansByVisitId } from '@/features/treatments/actions';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export default async function BacSiTreatmentsPage({ searchParams }: { searchParams: Promise<{ visitId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  
  // Lấy danh sách lượt khám để chọn bệnh nhân
  const visits = await prisma.visit.findMany({
    include: {
      patient: true
    },
    orderBy: {
      visitDate: 'desc'
    },
    take: 50
  });

  let visitId = resolvedSearchParams.visitId;
  if (!visitId && visits.length > 0) {
    visitId = visits[0].id;
  } else if (!visitId) {
    visitId = 'default-visit-id';
  }

  const result = await getPlansByVisitId(visitId);
  const plans = (result.success && result.data ? result.data : []) as any[];

  const employees = await prisma.employee.findMany({
    orderBy: { fullName: 'asc' }
  });

  const equipments = await prisma.equipment.findMany({
    orderBy: { name: 'asc' }
  });
  
  const usages = await prisma.equipmentUsage.findMany({
    where: { visitId },
    include: { equipment: true },
    orderBy: { startedAt: 'desc' }
  });

  return (
    <main className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
          🩺 Phân hệ Bác sĩ Điều trị
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý phác đồ & Quá trình điều trị</h1>
        <p className="text-gray-500 text-sm">Thiết lập phác đồ, theo dõi liệu trình, kiểm tra tương tác hoạt chất và ghi nhận thiết bị công nghệ cao</p>
      </div>

      <VisitSelector visits={visits} currentVisitId={visitId} />

      <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Đang thao tác điều trị cho Lượt khám: <strong>{visitId}</strong></span>
      </div>
      
      {visits.length > 0 ? (
        <div className="space-y-6">
          <InteractionRuleEnginePanel visitId={visitId} />
          <TreatmentsPanel initialPlans={plans} visitId={visitId} employees={employees} />
          <EquipmentUsagePanel initialUsages={usages} visitId={visitId} equipments={equipments} />
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">Chưa có dữ liệu bệnh nhân/lượt khám nào trong hệ thống.</p>
        </div>
      )}
    </main>
  );
}
