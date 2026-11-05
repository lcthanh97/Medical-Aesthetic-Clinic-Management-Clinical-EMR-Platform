import type { AuthActor } from '@/server/services/AuthService';
import type { IPrescriptionsService } from '@/server/services/IPrescriptionsService';
import { PrescriptionsValidator } from '@/server/validators/PrescriptionsValidator';

export class PrescriptionsController {
  constructor(
    private readonly service: IPrescriptionsService,
    private readonly validator = new PrescriptionsValidator(),
  ) {}

  getList(actor: AuthActor, query: unknown) {
    return this.service.getList(actor, this.validator.parseSearch(query));
  }

  getById(actor: AuthActor, id: string) {
    return this.service.getById(actor, id);
  }

  getAssignedVisits(actor: AuthActor, query: unknown) {
    return this.service.getAssignedVisits(actor, this.validator.parseSearch(query));
  }

  getMedicines(actor: AuthActor, query: unknown) {
    return this.service.getMedicines(actor, this.validator.parseSearch(query));
  }

  create(actor: AuthActor, input: unknown) {
    return this.service.create(actor, this.validator.parseCreate(input));
  }

  update(actor: AuthActor, id: string, input: unknown) {
    return this.service.update(actor, id, this.validator.parseUpdate(input));
  }
}
