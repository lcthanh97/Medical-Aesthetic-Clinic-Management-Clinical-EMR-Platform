import { ZodError } from 'zod';
import type { IBillingService } from '@/server/services/IBillingService';
import { BillingValidator } from '@/server/validators/BillingValidator';
import { DomainError } from '@/domain/errors/DomainError';
import type { ApiResponse } from '@/types/api';
import type {
  PaymentConfirmResponse,
  InvoiceDto,
  BillingSummaryDto,
  VNPayPaymentResponse,
} from '@/features/billing/types/billing.types';

export class BillingController {
  constructor(private readonly billingService: IBillingService) {}

  /**
   * GET /api/invoices/visits/[visitId]/summary
   * BIL-01: Bảng kê tổng hợp chi phí toàn bộ lượt khám.
   * Phân biệt rõ khoản phải thu lần này và khoản CLS đã trả trước.
   */
  async getVisitBillingSummary(
    visitId: string
  ): Promise<{ status: number; body: ApiResponse<BillingSummaryDto> }> {
    try {
      if (!visitId) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'MISSING_VISIT_ID', details: 'Vui lòng cung cấp mã lượt khám' },
          },
        };
      }

      const summary = await this.billingService.getVisitBillingSummary(visitId);
      return {
        status: 200,
        body: {
          success: true,
          data: summary,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: err.code === 'VISIT_NOT_FOUND' ? 404 : 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * POST /api/invoices/finalize-visit/[visitId]
   * BIL-01: Lập/chốt hóa đơn cuối cho lượt khám.
   */
  async finalizeVisitInvoice(
    visitId: string,
    accountId?: string
  ): Promise<{ status: number; body: ApiResponse<InvoiceDto> }> {
    try {
      if (!visitId) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'MISSING_VISIT_ID', details: 'Vui lòng cung cấp mã lượt khám' },
          },
        };
      }

      const invoice = await this.billingService.finalizeVisitInvoice(visitId, accountId);
      return {
        status: 201,
        body: {
          success: true,
          data: invoice,
          message: 'Lập hóa đơn cuối lượt khám thành công (đã loại trừ các khoản CLS đã thanh toán trước).',
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: err.code === 'VISIT_NOT_FOUND' ? 404 : 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * POST /api/payments/cash
   * BIL-02: Xác nhận thu tiền mặt (CASH) từ bệnh nhân.
   */
  async confirmCashPayment(
    body: unknown,
    accountId?: string
  ): Promise<{ status: number; body: ApiResponse<PaymentConfirmResponse> }> {
    try {
      const validated = BillingValidator.validateCashPayment(body);
      const result = await this.billingService.confirmCashPayment(validated, accountId);

      return {
        status: 200,
        body: {
          success: true,
          data: result,
          message: result.message,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      if (err instanceof ZodError) {
        const details = err.issues?.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ') || err.message;
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'VALIDATION_ERROR', details },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message || 'Lỗi xử lý thanh toán tiền mặt' },
        },
      };
    }
  }

  /**
   * POST /api/payments/vnpay/create
   * BIL-02: Tạo URL thanh toán VNPay Sandbox.
   */
  async createVNPayPayment(
    body: unknown,
    reqIp?: string
  ): Promise<{ status: number; body: ApiResponse<VNPayPaymentResponse> }> {
    try {
      const validated = BillingValidator.validateCreateVNPay(body);
      const result = await this.billingService.createVNPayPayment(validated, reqIp);

      return {
        status: 200,
        body: {
          success: true,
          data: result,
          message: result.message,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      if (err instanceof ZodError) {
        const details = err.issues?.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ') || err.message;
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'VALIDATION_ERROR', details },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message || 'Lỗi khởi tạo VNPay Sandbox' },
        },
      };
    }
  }

  /**
   * GET /api/payments/vnpay/return hoặc IPN
   * BIL-02: Xác minh kết quả thanh toán từ VNPay.
   */
  async handleVNPayCallback(
    queryParams: Record<string, string>,
    accountId?: string
  ): Promise<{ status: number; body: ApiResponse<PaymentConfirmResponse> }> {
    try {
      const result = await this.billingService.verifyVNPayCallback(queryParams, accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: result,
          message: result.message,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'VNPAY_CALLBACK_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * GET /api/payments/[paymentId] hoặc hóa đơn
   */
  async getInvoice(
    invoiceId: string
  ): Promise<{ status: number; body: ApiResponse<InvoiceDto> }> {
    try {
      if (!invoiceId) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'MISSING_INVOICE_ID', details: 'Vui lòng cung cấp mã hóa đơn' },
          },
        };
      }

      const invoice = await this.billingService.getById(invoiceId);
      if (!invoice) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: 'INVOICE_NOT_FOUND', details: 'Không tìm thấy hóa đơn' },
          },
        };
      }

      return {
        status: 200,
        body: {
          success: true,
          data: invoice,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  async getInvoiceByOrderId(
    orderId: string
  ): Promise<{ status: number; body: ApiResponse<InvoiceDto> }> {
    try {
      const invoice = await this.billingService.getInvoiceByOrderId(orderId);
      if (!invoice) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: 'INVOICE_NOT_FOUND', details: 'Chưa có hóa đơn cho lệnh chỉ định này' },
          },
        };
      }

      return {
        status: 200,
        body: {
          success: true,
          data: invoice,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  async getList(): Promise<{ status: number; body: ApiResponse<InvoiceDto[]> }> {
    try {
      const list = await this.billingService.getList();
      return {
        status: 200,
        body: {
          success: true,
          data: list,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }
}
