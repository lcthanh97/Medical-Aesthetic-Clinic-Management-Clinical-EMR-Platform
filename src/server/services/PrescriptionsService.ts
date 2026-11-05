import type { IPrescriptionsRepository } from '@/server/repositories/IPrescriptionsRepository';
import { PrescriptionsMapper } from '@/server/mappers/PrescriptionsMapper';
import type { AuthActor } from '@/server/services/AuthService';
import type { IPrescriptionsService } from './IPrescriptionsService';
import type {
  PrescriptionCreateInput,
  PrescriptionListView,
  PrescriptionMedicineView,
  PrescriptionUpdateInput,
  PrescriptionView,
  PrescriptionVisitView,
} from '@/features/prescriptions/schemas/prescriptions.schema';

export const PRESCRIPTION_READ = 'PRESCRIPTION_READ';
export const PRESCRIPTION_WRITE = 'PRESCRIPTION_WRITE';
export const PRESCRIPTION_DRAFT_TEST_STATUS = 'DRAFT';

export function hasPrescriptionPermission(actor: AuthActor, permissionCode: string): boolean {
  if (!actor.accountId || !actor.employeeId || !actor.sessionId) return false;
  return actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes(permissionCode));
}

function hasPrescriptionWriteRole(actor: AuthActor): boolean {
  if (!actor.accountId || !actor.employeeId || !actor.sessionId) return false;
  return actor.rolePermissions.some(({ permissionCodes }) =>
    permissionCodes.includes(PRESCRIPTION_READ) && permissionCodes.includes(PRESCRIPTION_WRITE),
  );
}

function assertEmployee(actor: AuthActor, permissionCode: string): asserts actor is AuthActor & { employeeId: string } {
  if (!hasPrescriptionPermission(actor, permissionCode)) throw new Error('PRESCRIPTION_ACCESS_DENIED');
}

function assertWriter(actor: AuthActor): asserts actor is AuthActor & { employeeId: string } {
  if (!hasPrescriptionWriteRole(actor)) throw new Error('PRESCRIPTION_ACCESS_DENIED');
}

function toVisitView(record: Awaited<ReturnType<IPrescriptionsRepository['findAssignedVisits']>>[number]): PrescriptionVisitView {
  return {
    id: record.id,
    visitDate: record.visitDate.toISOString(),
    status: record.status,
    patient: record.patient,
  };
}

function toMedicineView(record: Awaited<ReturnType<IPrescriptionsRepository['findActiveMedicines']>>[number]): PrescriptionMedicineView {
  return { id: record.id, name: record.name, unit: record.unit, status: record.status };
}

export class PrescriptionsService implements IPrescriptionsService {
  constructor(private readonly repository: IPrescriptionsRepository) {}

  async getById(actor: AuthActor, id: string): Promise<PrescriptionView> {
    assertEmployee(actor, PRESCRIPTION_READ);
    const record = await this.repository.findByIdForEmployee(id, actor.employeeId);
    if (!record) throw new Error('PRESCRIPTION_NOT_FOUND');
    const canEdit = record.employeeId === actor.employeeId &&
      record.status === PRESCRIPTION_DRAFT_TEST_STATUS &&
      hasPrescriptionWriteRole(actor);
    return PrescriptionsMapper.toView(record, canEdit);
  }

  async getList(actor: AuthActor, search?: string): Promise<PrescriptionListView> {
    assertEmployee(actor, PRESCRIPTION_READ);
    const records = await this.repository.findManyForEmployee(actor.employeeId, search);
    return {
      prescriptions: records.map((record) => {
        const canEdit = record.employeeId === actor.employeeId &&
          record.status === PRESCRIPTION_DRAFT_TEST_STATUS &&
          hasPrescriptionPermission(actor, PRESCRIPTION_WRITE);
        return PrescriptionsMapper.toView(record, canEdit);
      }),
      canWrite: hasPrescriptionWriteRole(actor),
    };
  }

  async getAssignedVisits(actor: AuthActor, search?: string): Promise<PrescriptionVisitView[]> {
    assertWriter(actor);
    return (await this.repository.findAssignedVisits(actor.employeeId, search)).map(toVisitView);
  }

  async getMedicines(actor: AuthActor, search?: string): Promise<PrescriptionMedicineView[]> {
    assertWriter(actor);
    return (await this.repository.findActiveMedicines(search)).map(toMedicineView);
  }

  async create(actor: AuthActor, input: PrescriptionCreateInput): Promise<PrescriptionView> {
    assertWriter(actor);
    const id = await this.repository.createForAssignedVisit(actor.employeeId, input.visitId, input.items);
    const record = await this.repository.findByIdForEmployee(id, actor.employeeId);
    if (!record) throw new Error('PRESCRIPTION_NOT_FOUND');
    return PrescriptionsMapper.toView(record, true);
  }

  async update(actor: AuthActor, id: string, input: PrescriptionUpdateInput): Promise<PrescriptionView> {
    assertWriter(actor);
    await this.repository.replaceOwnDraftItems(id, actor.employeeId, input.items);
    const record = await this.repository.findByIdForEmployee(id, actor.employeeId);
    if (!record) throw new Error('PRESCRIPTION_NOT_FOUND');
    return PrescriptionsMapper.toView(record, true);
  }
}
