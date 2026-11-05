import type { ImagingOrderView, ImagingResultInput, ImagingResultUpdateInput } from '@/features/clinical-services/schemas/clinical-services.schema';
import type { AuthActor } from './AuthService';

export interface IClinicalServicesService {
  getImagingOrders(actor: AuthActor, search?: string): Promise<ImagingOrderView[]>;
  getImagingOrder(actor: AuthActor, orderId: string): Promise<ImagingOrderView>;
  createImagingResult(actor: AuthActor, input: ImagingResultInput): Promise<ImagingOrderView>;
  updateImagingResult(actor: AuthActor, input: ImagingResultUpdateInput): Promise<ImagingOrderView>;
}
