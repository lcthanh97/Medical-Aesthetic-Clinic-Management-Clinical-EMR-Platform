import type {
  CashPaymentDto,
  InvoiceDto,
  PaymentConfirmResponse,
  BillingSummaryDto,
  CreateVNPayPaymentDto,
  VNPayPaymentResponse,
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

  // BIL-01: Lập hóa đơn cuối lượt & Bảng kê chi phí
  getVisitBillingSummary(visitId: string): Promise<BillingSummaryDto>;
  finalizeVisitInvoice(visitId: string, accountId?: string): Promise<InvoiceDto>;

  // BIL-02: Thanh toán VNPay Sandbox
  createVNPayPayment(dto: CreateVNPayPaymentDto, clientIp?: string): Promise<VNPayPaymentResponse>;
  verifyVNPayCallback(queryParams: Record<string, string>, accountId?: string): Promise<PaymentConfirmResponse>;
}
