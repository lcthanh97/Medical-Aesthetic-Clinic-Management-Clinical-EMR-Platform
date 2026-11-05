import type { AuthActor } from '@/server/services/AuthService';
import type { INotificationsService } from '@/server/services/INotificationsService';
import { NotificationsMapper } from '@/server/mappers/NotificationsMapper';
import { NotificationsValidator } from '@/server/validators/NotificationsValidator';

export class NotificationsController {
  constructor(
    private readonly service: INotificationsService,
    private readonly validator = new NotificationsValidator(),
  ) {}

  async getList(actor: AuthActor, filters: unknown) {
    const result = await this.service.getList(actor, this.validator.parseList(filters));
    return NotificationsMapper.toPage(result);
  }

  async getById(actor: AuthActor, id: unknown) {
    const record = await this.service.getById(actor, this.validator.parseId(id));
    return NotificationsMapper.toView(record);
  }
}
