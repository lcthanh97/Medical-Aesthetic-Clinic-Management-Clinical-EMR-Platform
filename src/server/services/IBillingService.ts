import type {
  CashPaymentDto,
  InvoiceDto,
  PaymentConfirmResponse,
} from '@/features/billing/types/billing.types';

export interface IBillingService {
  getById(id: string): Promise<InvoiceDto | null>;
  getList(): Promise<InvoiceDto[]>;
  createClsInvoice(
    orderId: string,
    services: Array<{ serviceCode: string; serviceName?: string; price?: number }>,
    accountId?: string
  ): Promise<InvoiceDto>;
  confirmCashPayment(dto: CashPaymentDto, accountId?: string): Promise<PaymentConfirmResponse>;
  getInvoiceByOrderId(orderId: string): Promise<InvoiceDto | null>;
}
