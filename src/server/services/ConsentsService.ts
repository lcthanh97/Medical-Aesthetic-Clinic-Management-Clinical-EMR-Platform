import type { IConsentsRepository } from '@/server/repositories/IConsentsRepository';
import type { IConsentsService } from './IConsentsService';
import type { DoctorConsentFilters } from '@/features/consents/schemas/consents.schema';
import type { AuthActor } from './AuthService';
import { AuthorizationService } from '@/server/policies/AuthorizationService';

const PAGE_SIZE = 25;

export class ConsentsService implements IConsentsService {
  private readonly authorization = new AuthorizationService();

  constructor(private readonly repository: IConsentsRepository) {}

  getById(id: string) { return this.repository.findById(id); }
  getList() { return this.repository.findMany(); }

  async getAssignedTreatmentConsents(actor: AuthActor, filters: DoctorConsentFilters) {
    if (!actor.accountId || !actor.employeeId || !actor.sessionId || !this.authorization.hasPermission(actor, 'EMR_READ')) {
      throw new Error('CONSENT_ACCESS_DENIED');
    }

    const result = await this.repository.findManyForAssignedEmployee({
      accountId: actor.accountId,
      employeeId: actor.employeeId,
      sessionId: actor.sessionId,
    }, filters);
    const start = (filters.page - 1) * PAGE_SIZE;
    const items = result.items.slice(start, start + PAGE_SIZE);
    const unique = <T,>(values: T[], key: (value: T) => string) => [...new Map(values.map((value) => [key(value), value])).values()];

    return {
      items,
      total: result.items.length,
      page: filters.page,
      pageSize: PAGE_SIZE,
      capped: result.capped,
      options: {
        patients: unique(result.items.map(({ visit }) => visit.patient), (value) => value.id).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
        plans: unique(result.items.flatMap(({ plan }) => plan ? [{ id: plan.id, name: plan.name }] : []), (value) => value.id).sort((a, b) => a.name.localeCompare(b.name, 'vi')),
        templates: unique(result.items.map(({ template }) => ({ id: template.id, name: template.name, version: template.version })), (value) => value.id).sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      },
    };
  }
}
