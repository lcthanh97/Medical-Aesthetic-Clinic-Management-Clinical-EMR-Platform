import type {
  CreateClinicalOrderDto,
  ClinicalOrderItem,
  SubmitResultsDto,
  ClsPaymentStatusResponse,
} from '@/features/clinical-services/types/clinical-services.types';
import type { ClsCatalogService } from '@/server/repositories/IClinicalServicesRepository';

export interface IClinicalServicesService {
  createOrder(dto: CreateClinicalOrderDto, accountId?: string): Promise<ClinicalOrderItem>;
  getById(id: string): Promise<ClinicalOrderItem>;
  getByVisitId(visitId: string): Promise<ClinicalOrderItem[]>;
  checkPaymentStatus(orderId: string): Promise<ClsPaymentStatusResponse>;
  startExecution(orderId: string, accountId?: string): Promise<ClinicalOrderItem>;
  submitResults(orderId: string, dto: SubmitResultsDto, accountId?: string): Promise<ClinicalOrderItem>;
  getCatalog(): Promise<ClsCatalogService[]>;
}
