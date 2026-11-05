import { describe, expect, it, vi } from 'vitest';
import { ClinicalServicesService } from '@/server/services/ClinicalServicesService';
import { ClinicalServicesValidator } from '@/server/validators/ClinicalServicesValidator';
import type { IClinicalServicesRepository, ImagingOrderRecord } from '@/server/repositories/IClinicalServicesRepository';
import type { AuthActor } from '@/server/services/AuthService';

function actor(roles: string[][], employeeId: string | null = 'employee-1'): AuthActor {
  return {
    accountId: 'account-1', sessionId: 'session-1', username: 'synthetic-clinician',
    employeeId, employeeName: 'Synthetic only', roleNames: roles.map((_, index) => `Synthetic role ${index}`),
    rolePermissions: roles.map((permissionCodes, index) => ({ roleName: `Synthetic role ${index}`, permissionCodes })),
  };
}

function record(): ImagingOrderRecord {
  return {
    id: 'order-1', type: 'TEST_ONLY', status: 'TEST_ONLY', orderedAt: new Date('2026-01-01T00:00:00Z'),
    orderedBy: null, service: null,
    visit: { id: 'visit-1', employeeId: 'employee-1', visitDate: new Date('2026-01-01T00:00:00Z'), status: 'TEST_ONLY', patient: { patientCode: 'SYNTHETIC', fullName: 'Synthetic Patient' } },
    imagingResults: [],
  };
}

function repository(overrides: Partial<IClinicalServicesRepository> = {}): IClinicalServicesRepository {
  const data = record();
  return {
    findImagingOrdersForEmployee: vi.fn(async () => [data]),
    findImagingOrderForEmployee: vi.fn(async () => data),
    findImagingResultScopeForEmployee: vi.fn(async () => ({ orderId: 'order-1', type: 'TEST_ONLY', status: 'TEST_ONLY' })),
    createImagingResultForAssignedOrder: vi.fn(async () => 'result-1'),
    updateImagingResultForAssignedOrder: vi.fn(async () => 'order-1'),
    ...overrides,
  };
}

describe('ClinicalServicesService / CLS-03', () => {
  it('allows read only with IMAGE_READ and employee identity', async () => {
    const repo = repository();
    const orders = await new ClinicalServicesService(repo, { allowedTypes: ['TEST_ONLY'], allowedStatuses: ['TEST_ONLY'] }).getImagingOrders(actor([['IMAGE_READ']]));
    expect(orders).toHaveLength(1);
    expect(orders[0].canWrite).toBe(false);
    expect(repo.findImagingOrdersForEmployee).toHaveBeenCalledWith('employee-1', undefined);
  });

  it('requires IMAGE_READ and IMAGE_WRITE within the same role to write', async () => {
    const service = new ClinicalServicesService(repository(), { allowedTypes: ['TEST_ONLY'], allowedStatuses: ['TEST_ONLY'] });
    await expect(service.createImagingResult(actor([['IMAGE_READ'], ['IMAGE_WRITE']]), {
      orderId: 'order-1', imagingType: 'synthetic image type', conclusion: 'synthetic conclusion',
    })).rejects.toThrow('IMAGING_ACCESS_DENIED');
    await expect(service.createImagingResult(actor([['IMAGE_READ', 'IMAGE_WRITE']]), {
      orderId: 'order-1', imagingType: 'synthetic image type', conclusion: 'synthetic conclusion',
    })).resolves.toMatchObject({ id: 'order-1', imagingResults: [] });
  });

  it('fails closed when session, account or employee identity is missing', async () => {
    const service = new ClinicalServicesService(repository());
    await expect(service.getImagingOrders({ ...actor([['IMAGE_READ']]), sessionId: '' })).rejects.toThrow('IMAGING_ACCESS_DENIED');
    await expect(service.getImagingOrders({ ...actor([['IMAGE_READ']]), accountId: '' })).rejects.toThrow('IMAGING_ACCESS_DENIED');
    await expect(service.getImagingOrders(actor([['IMAGE_READ']], null))).rejects.toThrow('IMAGING_ACCESS_DENIED');
  });

  it('validates IDs and non-empty content with bounded lengths', () => {
    const validator = new ClinicalServicesValidator();
    expect(validator.parseCreateImagingResult({ orderId: 'o1', imagingType: 'type', conclusion: 'text' })).toEqual({ orderId: 'o1', imagingType: 'type', conclusion: 'text' });
    expect(() => validator.parseCreateImagingResult({ orderId: '', imagingType: '', conclusion: '' })).toThrow();
    expect(() => validator.parseCreateImagingResult({ orderId: 'o1', imagingType: 'x'.repeat(121), conclusion: 'text' })).toThrow();
    expect(() => validator.parseUpdateImagingResult({ resultId: 'r1', imagingType: 'type', conclusion: 'x'.repeat(10001) })).toThrow();
    expect(validator.parseSearch({ q: '  order  ' })).toBe('order');
  });

  it('does not return an order outside the employee assignment', async () => {
    const repo = repository({ findImagingOrderForEmployee: vi.fn(async () => null) });
    await expect(new ClinicalServicesService(repo, { allowedTypes: ['TEST_ONLY'], allowedStatuses: ['TEST_ONLY'] }).getImagingOrder(actor([['IMAGE_READ']]), 'foreign-order'))
      .rejects.toThrow('CLINICAL_ORDER_NOT_FOUND');
    expect(repo.findImagingOrderForEmployee).toHaveBeenCalledWith('foreign-order', 'employee-1');
  });

  it('keeps write fail-closed when order type or status has no verified allowlist', async () => {
    const service = new ClinicalServicesService(repository(), { allowedTypes: [], allowedStatuses: [] });
    const readerWriter = actor([['IMAGE_READ', 'IMAGE_WRITE']]);
    await expect(service.createImagingResult(readerWriter, {
      orderId: 'order-1', imagingType: 'synthetic type', conclusion: 'synthetic conclusion',
    })).rejects.toThrow('IMAGING_ORDER_TYPE_STATUS_UNVERIFIED');
  });
});
