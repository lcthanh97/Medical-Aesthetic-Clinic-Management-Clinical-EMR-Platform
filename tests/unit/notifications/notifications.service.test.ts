import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthActor } from '@/server/services/AuthService';
import type { INotificationsRepository } from '@/server/repositories/INotificationsRepository';
import { NotificationsService } from '@/server/services/NotificationsService';
import { NotificationsValidator } from '@/server/validators/NotificationsValidator';

describe('NotificationsService', () => {
  let repository: INotificationsRepository;
  let service: NotificationsService;
  const actor: AuthActor = {
    accountId: 'account-a', sessionId: 'session-a', username: 'synthetic',
    employeeId: null, employeeName: null, roleNames: ['reader'],
    rolePermissions: [{ roleName: 'reader', permissionCodes: ['NOTIFICATION_READ'] }],
  };

  beforeEach(() => {
    repository = {
      findForRecipient: vi.fn(),
      findByIdForRecipient: vi.fn(),
    };
    service = new NotificationsService(repository);
  });

  it('fails closed without NOTIFICATION_READ', async () => {
    await expect(service.getList({ ...actor, rolePermissions: [] }, { page: 0 }))
      .rejects.toThrow('NOTIFICATION_ACCESS_DENIED');
    expect(repository.findForRecipient).not.toHaveBeenCalled();
  });

  it('scopes the repository query to the authenticated account and hides delivery metadata without its permission', async () => {
    vi.mocked(repository.findForRecipient).mockResolvedValue({ rows: [], totalRows: 0, page: 0, pageSize: 25 });
    await service.getList(actor, { type: 'TEST_ONLY', page: 0 });
    expect(repository.findForRecipient).toHaveBeenCalledWith({ accountId: 'account-a' }, { type: 'TEST_ONLY', page: 0 }, false);
  });

  it('does not combine delivery permission across roles', async () => {
    vi.mocked(repository.findForRecipient).mockResolvedValue({ rows: [], totalRows: 0, page: 0, pageSize: 25 });
    const splitActor = {
      ...actor,
      rolePermissions: [
        { roleName: 'read-role', permissionCodes: ['NOTIFICATION_READ'] },
        { roleName: 'delivery-role', permissionCodes: ['NOTIFICATION_DELIVERY_READ'] },
      ],
    };
    await service.getList(splitActor, { page: 0 });
    expect(repository.findForRecipient).toHaveBeenCalledWith({ accountId: 'account-a' }, { page: 0 }, false);
  });

  it('includes delivery fields only when read and delivery permissions are on the same role', async () => {
    vi.mocked(repository.findForRecipient).mockResolvedValue({ rows: [], totalRows: 0, page: 0, pageSize: 25 });
    const allowedActor = {
      ...actor,
      rolePermissions: [{ roleName: 'reader', permissionCodes: ['NOTIFICATION_READ', 'NOTIFICATION_DELIVERY_READ'] }],
    };
    await service.getList(allowedActor, { page: 0 });
    expect(repository.findForRecipient).toHaveBeenCalledWith({ accountId: 'account-a' }, { page: 0 }, true);
  });

  it('returns the same not-found result for an ID outside the recipient scope', async () => {
    vi.mocked(repository.findByIdForRecipient).mockResolvedValue(null);
    await expect(service.getById(actor, 'foreign-id')).rejects.toThrow('NOTIFICATION_NOT_FOUND');
    expect(repository.findByIdForRecipient).toHaveBeenCalledWith({ accountId: 'account-a' }, 'foreign-id', false);
  });

  it('validates exact type/status filters and bounds pagination', () => {
    const validator = new NotificationsValidator();
    expect(validator.parseList({ type: ' CUSTOM_TYPE ', page: 2 })).toEqual({ type: 'CUSTOM_TYPE', page: 2 });
    expect(() => validator.parseList({ page: 201 })).toThrow();
    expect(() => validator.parseId('')).toThrow();
  });
});
