import type { AuthActor } from '@/server/services/AuthService';
import type { IClinicalServicesService } from '@/server/services/IClinicalServicesService';
import { ClinicalServicesValidator } from '@/server/validators/ClinicalServicesValidator';

export class ClinicalServicesController {
  constructor(
    private readonly service: IClinicalServicesService,
    private readonly validator = new ClinicalServicesValidator(),
  ) {}

  getImagingOrders(actor: AuthActor, query: unknown) {
    return this.service.getImagingOrders(actor, this.validator.parseSearch(query));
  }

  getImagingOrder(actor: AuthActor, orderId: string) {
    return this.service.getImagingOrder(actor, this.validator.parseOrderId(orderId));
  }

  createImagingResult(actor: AuthActor, input: unknown) {
    return this.service.createImagingResult(actor, this.validator.parseCreateImagingResult(input));
  }

  updateImagingResult(actor: AuthActor, input: unknown) {
    return this.service.updateImagingResult(actor, this.validator.parseUpdateImagingResult(input));
  }
}
