import type { AuthActor } from './AuthService';
import type { NotificationFilters, NotificationPage, NotificationRecord } from '@/server/repositories/INotificationsRepository';

export interface INotificationsService {
  getList(actor: AuthActor, filters: NotificationFilters): Promise<NotificationPage>;
  getById(actor: AuthActor, id: string): Promise<NotificationRecord>;
}
