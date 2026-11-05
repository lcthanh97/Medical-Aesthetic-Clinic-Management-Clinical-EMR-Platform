import type { ImagingOrderView } from '@/features/clinical-services/schemas/clinical-services.schema';
import { ClinicalServicesMapper } from '@/server/mappers/ClinicalServicesMapper';
import type { IClinicalServicesRepository, ImagingOrderRecord } from '@/server/repositories/IClinicalServicesRepository';
import type { AuthActor } from './AuthService';
import type { IClinicalServicesService } from './IClinicalServicesService';

export const IMAGE_READ = 'IMAGE_READ';
export const IMAGE_WRITE = 'IMAGE_WRITE';

export interface ClinicalOrderWritePolicy {
  allowedTypes: readonly string[];
  allowedStatuses: readonly string[];
}

function parseAllowedValues(value: string | undefined): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function defaultWritePolicy(): ClinicalOrderWritePolicy {
  return {
    allowedTypes: parseAllowedValues(process.env.CLS03_ALLOWED_ORDER_TYPES),
    allowedStatuses: parseAllowedValues(process.env.CLS03_ALLOWED_ORDER_STATUSES),
  };
}

export function hasImageRead(actor: AuthActor): boolean {
  return Boolean(actor.accountId && actor.sessionId && actor.employeeId) &&
    actor.rolePermissions.some(({ permissionCodes }) => permissionCodes.includes(IMAGE_READ));
}

export function hasImageWrite(actor: AuthActor): boolean {
  return Boolean(actor.accountId && actor.sessionId && actor.employeeId) &&
    actor.rolePermissions.some(({ permissionCodes }) =>
      permissionCodes.includes(IMAGE_READ) && permissionCodes.includes(IMAGE_WRITE),
    );
}

function requireRead(actor: AuthActor): asserts actor is AuthActor & { employeeId: string } {
  if (!hasImageRead(actor)) throw new Error('IMAGING_ACCESS_DENIED');
}

function requireWrite(actor: AuthActor): asserts actor is AuthActor & { employeeId: string } {
  if (!hasImageWrite(actor)) throw new Error('IMAGING_ACCESS_DENIED');
}

export class ClinicalServicesService implements IClinicalServicesService {
  constructor(
    private readonly repository: IClinicalServicesRepository,
    private readonly writePolicy: ClinicalOrderWritePolicy = defaultWritePolicy(),
  ) {}

  private isOrderWritable(order: Pick<ImagingOrderRecord, 'type' | 'status'>): boolean {
    return this.writePolicy.allowedTypes.length > 0 && this.writePolicy.allowedStatuses.length > 0 &&
      this.writePolicy.allowedTypes.includes(order.type) && this.writePolicy.allowedStatuses.includes(order.status);
  }

  private assertOrderWritable(order: Pick<ImagingOrderRecord, 'type' | 'status'>): void {
    if (!this.isOrderWritable(order)) throw new Error('IMAGING_ORDER_TYPE_STATUS_UNVERIFIED');
  }

  async getImagingOrders(actor: AuthActor, search?: string): Promise<ImagingOrderView[]> {
    requireRead(actor);
    const records = await this.repository.findImagingOrdersForEmployee(actor.employeeId, search);
    return records.map((record) => {
      const hasWritePermission = hasImageWrite(actor);
      const orderWritable = this.isOrderWritable(record);
      return ClinicalServicesMapper.toImagingOrderView(
        record,
        hasWritePermission && orderWritable,
        hasWritePermission && !orderWritable ? 'ORDER_TYPE_STATUS_UNVERIFIED' : null,
      );
    });
  }

  async getImagingOrder(actor: AuthActor, orderId: string): Promise<ImagingOrderView> {
    requireRead(actor);
    const record = await this.repository.findImagingOrderForEmployee(orderId, actor.employeeId);
    if (!record) throw new Error('CLINICAL_ORDER_NOT_FOUND');
    const hasWritePermission = hasImageWrite(actor);
    const orderWritable = this.isOrderWritable(record);
    return ClinicalServicesMapper.toImagingOrderView(
      record,
      hasWritePermission && orderWritable,
      hasWritePermission && !orderWritable ? 'ORDER_TYPE_STATUS_UNVERIFIED' : null,
    );
  }

  async createImagingResult(actor: AuthActor, input: { orderId: string; imagingType: string; conclusion: string }): Promise<ImagingOrderView> {
    requireWrite(actor);
    const scopedOrder = await this.repository.findImagingOrderForEmployee(input.orderId, actor.employeeId);
    if (!scopedOrder) throw new Error('CLINICAL_ORDER_NOT_FOUND');
    this.assertOrderWritable(scopedOrder);
    await this.repository.createImagingResultForAssignedOrder(actor.employeeId, input.orderId, {
      imagingType: input.imagingType,
      conclusion: input.conclusion,
    });
    const record = await this.repository.findImagingOrderForEmployee(input.orderId, actor.employeeId);
    if (!record) throw new Error('CLINICAL_ORDER_NOT_FOUND');
    return ClinicalServicesMapper.toImagingOrderView(record, true);
  }

  async updateImagingResult(actor: AuthActor, input: { resultId: string; imagingType: string; conclusion: string }): Promise<ImagingOrderView> {
    requireWrite(actor);
    const scope = await this.repository.findImagingResultScopeForEmployee(input.resultId, actor.employeeId);
    if (!scope) throw new Error('IMAGING_RESULT_NOT_FOUND');
    this.assertOrderWritable(scope);
    const orderId = await this.repository.updateImagingResultForAssignedOrder(actor.employeeId, input.resultId, {
      imagingType: input.imagingType,
      conclusion: input.conclusion,
    });
    const record = await this.repository.findImagingOrderForEmployee(orderId, actor.employeeId);
    if (!record) throw new Error('IMAGING_RESULT_NOT_FOUND');
    return ClinicalServicesMapper.toImagingOrderView(record, true);
  }
}
