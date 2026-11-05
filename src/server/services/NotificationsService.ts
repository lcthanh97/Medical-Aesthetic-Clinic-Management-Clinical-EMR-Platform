import type { INotificationsRepository } from '@/server/repositories/INotificationsRepository';
import type { INotificationsService } from './INotificationsService';
export class NotificationsService implements INotificationsService {
  constructor(private readonly repository: INotificationsRepository) {}

  private hasPermission(actor: import('./AuthService').AuthActor, permissionCode: string) {
    return Boolean(actor.accountId) && actor.rolePermissions.some(({ permissionCodes }) =>
      permissionCodes.includes(permissionCode),
    );
  }

  private hasPermissionsInSameRole(actor: import('./AuthService').AuthActor, permissionCodes: string[]) {
    return actor.rolePermissions.some((role) => permissionCodes.every((code) => role.permissionCodes.includes(code)));
  }

  async getList(actor: import('./AuthService').AuthActor, filters: import('@/server/repositories/INotificationsRepository').NotificationFilters) {
    if (!this.hasPermission(actor, 'NOTIFICATION_READ')) throw new Error('NOTIFICATION_ACCESS_DENIED');
    const includeDeliveries = this.hasPermissionsInSameRole(actor, ['NOTIFICATION_READ', 'NOTIFICATION_DELIVERY_READ']);
    return this.repository.findForRecipient({ accountId: actor.accountId }, filters, includeDeliveries);
  }

  async getById(actor: import('./AuthService').AuthActor, id: string) {
    if (!this.hasPermission(actor, 'NOTIFICATION_READ')) throw new Error('NOTIFICATION_ACCESS_DENIED');
    const record = await this.repository.findByIdForRecipient(
      { accountId: actor.accountId }, id,
      this.hasPermissionsInSameRole(actor, ['NOTIFICATION_READ', 'NOTIFICATION_DELIVERY_READ']),
    );
    if (!record) throw new Error('NOTIFICATION_NOT_FOUND');
    return record;
  }
}
