import type { IClinicalServicesService } from '@/server/services/IClinicalServicesService';
import type { IBillingService } from '@/server/services/IBillingService';
import { DomainError } from '@/domain/errors/DomainError';
import type { ApiResponse } from '@/types/api';

export class ClinicalServicesController {
  constructor(
    private readonly service: IClinicalServicesService,
    private readonly billingService: IBillingService
  ) {}

  async createOrder(body: any, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const order = await this.service.createOrder(body, accountId);
      return {
        status: 201,
        body: {
          success: true,
          data: order,
          message: 'Tạo lệnh chỉ định Cận lâm sàng thành công. Hóa đơn đã được lập ở trạng thái Chờ thanh toán.',
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            message: error.message,
            error: { code: error.code },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          message: error.message || 'Lỗi khi tạo lệnh chỉ định CLS',
          error: { code: 'CREATE_ORDER_ERROR' },
        },
      };
    }
  }

  async getById(id: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const order = await this.service.getById(id);
      return {
        status: 200,
        body: {
          success: true,
          data: order,
        },
      };
    } catch (error: any) {
      const status = error instanceof DomainError && error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      return {
        status,
        body: {
          success: false,
          message: error.message || 'Không tìm thấy lệnh chỉ định',
          error: { code: error.code || 'GET_ORDER_ERROR' },
        },
      };
    }
  }

  async getOrderInvoice(orderId: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const invoice = await this.billingService.getInvoiceByOrderId(orderId);
      if (!invoice) {
        return {
          status: 404,
          body: {
            success: false,
            message: 'Lệnh chỉ định này chưa có hóa đơn thanh toán.',
            error: { code: 'INVOICE_NOT_FOUND' },
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
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi lấy hóa đơn CLS',
          error: { code: error.code || 'GET_INVOICE_ERROR' },
        },
      };
    }
  }

  async createOrGetInvoice(orderId: string, body: any, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const invoice = await this.billingService.createClsInvoice(orderId, body?.services || [], accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: invoice,
          message: 'Lập hóa đơn CLS thành công.',
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi tạo hóa đơn CLS',
          error: { code: error.code || 'CREATE_INVOICE_ERROR' },
        },
      };
    }
  }

  async getPaymentStatus(orderId: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const statusRes = await this.service.checkPaymentStatus(orderId);
      return {
        status: 200,
        body: {
          success: true,
          data: statusRes,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi tra cứu trạng thái thanh toán',
          error: { code: error.code || 'GET_PAYMENT_STATUS_ERROR' },
        },
      };
    }
  }

  async startExecution(orderId: string, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const updated = await this.service.startExecution(orderId, accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: updated,
          message: 'Xác nhận thanh toán hợp lệ. Đã bắt đầu thực hiện cận lâm sàng!',
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            message: error.message,
            error: { code: error.code },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          message: error.message || 'Lỗi khi bắt đầu thực hiện CLS',
          error: { code: 'START_EXECUTION_ERROR' },
        },
      };
    }
  }

  async submitResults(orderId: string, body: any, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const completed = await this.service.submitResults(orderId, body, accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: completed,
          message: 'Ghi nhận kết quả cận lâm sàng thành công.',
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            message: error.message,
            error: { code: error.code },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          message: error.message || 'Lỗi khi ghi nhận kết quả CLS',
          error: { code: 'SUBMIT_RESULTS_ERROR' },
        },
      };
    }
  }

  async getCatalog(): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const catalog = await this.service.getCatalog();
      return {
        status: 200,
        body: {
          success: true,
          data: catalog,
        },
      };
    } catch (error: any) {
      return {
        status: 500,
        body: {
          success: false,
          message: error.message || 'Lỗi khi tải danh mục dịch vụ CLS',
          error: { code: 'GET_CATALOG_ERROR' },
        },
      };
    }
  }
}
