import type { IBillingService } from '@/server/services/IBillingService';
import { DomainError } from '@/domain/errors/DomainError';
import type { ApiResponse } from '@/types/api';
import type { PaymentConfirmResponse, InvoiceDto } from '@/features/billing/types/billing.types';

export class BillingController {
  constructor(private readonly billingService: IBillingService) {}

  /**
   * POST /api/payments/cash
   * Xác nhận thanh toán tiền mặt cho hóa đơn (bao gồm cả hóa đơn CLS).
   */
  async confirmCashPayment(
    body: unknown,
    accountId?: string
  ): Promise<{ status: number; body: ApiResponse<PaymentConfirmResponse> }> {
    try {
      if (!body || typeof body !== 'object') {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'INVALID_REQUEST_BODY', details: 'Dữ liệu không hợp lệ' },
          },
        };
      }

      const { invoiceId, notes } = body as { invoiceId?: string; notes?: string };
      if (!invoiceId) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'MISSING_INVOICE_ID', details: 'Vui lòng cung cấp mã hóa đơn (invoiceId)' },
          },
        };
      }

      const result = await this.billingService.confirmCashPayment({ invoiceId, notes }, accountId);

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
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message || 'Lỗi xử lý thanh toán' },
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

  /**
   * Lấy hóa đơn theo OrderId
   */
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
}
