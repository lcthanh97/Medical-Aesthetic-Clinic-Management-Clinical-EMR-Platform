import type { ApiResponse } from '@/types/api';
import type {
  InvoiceDto,
  BillingSummaryDto,
  CashPaymentDto,
  PaymentConfirmResponse,
  CreateVNPayPaymentDto,
  VNPayPaymentResponse,
} from '@/features/billing/types/billing.types';

export const billingApi = {
  // Lấy danh sách hóa đơn
  async getInvoices(): Promise<ApiResponse<InvoiceDto[]>> {
    const res = await fetch('/api/billing');
    return res.json();
  },

  async getInvoiceById(id: string): Promise<ApiResponse<InvoiceDto>> {
    const res = await fetch(`/api/payments/${id}`);
    return res.json();
  },

  // BIL-01: Bảng kê chi phí tổng hợp cuối lượt khám
  async getVisitBillingSummary(visitId: string): Promise<ApiResponse<BillingSummaryDto>> {
    const res = await fetch(`/api/invoices/visits/${encodeURIComponent(visitId)}/summary`);
    return res.json();
  },

  // BIL-01: Lập hóa đơn cuối cho lượt khám
  async finalizeVisitInvoice(visitId: string): Promise<ApiResponse<InvoiceDto>> {
    const res = await fetch(`/api/invoices/finalize-visit/${encodeURIComponent(visitId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // BIL-02: Thanh toán tiền mặt (CASH)
  async confirmCashPayment(dto: CashPaymentDto): Promise<ApiResponse<PaymentConfirmResponse>> {
    const res = await fetch('/api/payments/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },

  // BIL-02: Khởi tạo thanh toán VNPay Sandbox
  async createVNPayPayment(dto: CreateVNPayPaymentDto): Promise<ApiResponse<VNPayPaymentResponse>> {
    const res = await fetch('/api/payments/vnpay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },
};
