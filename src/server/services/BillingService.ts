import type { IBillingRepository } from '@/server/repositories/IBillingRepository';
import type { IClinicalServicesRepository } from '@/server/repositories/IClinicalServicesRepository';
import type { IBillingService } from './IBillingService';
import { DomainError } from '@/domain/errors/DomainError';
import { PaymentStatus, OrderStatus } from '@/domain/enums';
import type {
  CashPaymentDto,
  InvoiceDto,
  PaymentConfirmResponse,
  InvoiceItemDetail,
} from '@/features/billing/types/billing.types';

export class BillingService implements IBillingService {
  constructor(
    private readonly billingRepository: IBillingRepository,
    private readonly clinicalServicesRepository?: IClinicalServicesRepository
  ) {}

  async getById(id: string): Promise<InvoiceDto | null> {
    const invoice = await this.billingRepository.findInvoiceById(id);
    if (!invoice) return null;
    return {
      id: invoice.id,
      visitId: invoice.visitId,
      total: invoice.total,
      status: invoice.status,
      payments: invoice.payments?.map((p: any) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : String(p.paidAt),
      })),
    };
  }

  async getList(): Promise<InvoiceDto[]> {
    const list = await this.billingRepository.findMany();
    return list.map((inv: any) => ({
      id: inv.id,
      visitId: inv.visitId,
      total: inv.total,
      status: inv.status,
    }));
  }

  /**
   * Tạo hóa đơn riêng cho lệnh chỉ định Cận lâm sàng (CLS).
   * Đảm bảo Idempotency (không tạo trùng lặp cho cùng một order).
   */
  async createClsInvoice(
    orderId: string,
    services: Array<{ serviceCode: string; serviceName?: string; price?: number }>,
    accountId?: string
  ): Promise<InvoiceDto> {
    if (!this.clinicalServicesRepository) {
      throw new DomainError('Chưa cấu hình repository cận lâm sàng', 'MISSING_CLS_REPOSITORY');
    }

    const order = await this.clinicalServicesRepository.findOrderById(orderId);
    if (!order) {
      throw new DomainError(`Không tìm thấy lệnh chỉ định: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new DomainError('Lệnh chỉ định đã bị hủy, không thể lập hóa đơn thanh toán.', 'ORDER_CANCELLED');
    }

    // 1. Kiểm tra xem lệnh này đã có hóa đơn liên kết chưa (chống tạo trùng lặp)
    const existingInvoice = await this.clinicalServicesRepository.findLinkedInvoiceForOrder(orderId);
    if (existingInvoice) {
      return {
        id: existingInvoice.id,
        visitId: existingInvoice.visitId,
        total: existingInvoice.total,
        status: existingInvoice.status,
        orderId,
      };
    }

    // 2. Tính tổng tiền từ danh sách dịch vụ
    const items: InvoiceItemDetail[] = services.map((s) => ({
      serviceCode: s.serviceCode,
      serviceName: s.serviceName || s.serviceCode,
      price: s.price ?? 0,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // 3. Tạo bản ghi Invoice trong database ở trạng thái UNPAID
    const createdInvoice = await this.billingRepository.createInvoice({
      visitId: order.visitId,
      total: totalAmount,
      status: PaymentStatus.UNPAID,
    });

    // 4. Tạo liên kết định danh giữa ClinicalOrder và Invoice qua AuditLog
    await this.clinicalServicesRepository.createAudit({
      action: `CLS_INVOICE_LINK: Invoice ${createdInvoice.id}`,
      entity: 'ClinicalOrder',
      entityId: orderId,
      accountId: createdInvoice.id,
    });

    // 5. Lưu snapshot danh sách dịch vụ chi tiết vào audit log
    await this.billingRepository.createAudit({
      action: `CLS_INVOICE_ITEMS_SNAPSHOT: ${JSON.stringify(items)}`,
      entity: 'Invoice',
      entityId: createdInvoice.id,
      accountId,
    });

    // 6. Cập nhật trạng thái lệnh chỉ định sang AWAITING_PAYMENT nếu đang là CREATED
    if (order.status === OrderStatus.CREATED) {
      await this.clinicalServicesRepository.updateOrderStatus(orderId, OrderStatus.AWAITING_PAYMENT);
    }

    return {
      id: createdInvoice.id,
      visitId: createdInvoice.visitId,
      total: totalAmount,
      status: PaymentStatus.UNPAID,
      orderId,
      items,
    };
  }

  /**
   * Thu ngân xác nhận thu tiền mặt (CASH) từ bệnh nhân.
   * Cập nhật trạng thái Invoice thành PAID, ghi nhận giao dịch Payment,
   * đồng thời tự động kích hoạt điều kiện mở quyền thực hiện CLS nếu hóa đơn thuộc CLS.
   */
  async confirmCashPayment(dto: CashPaymentDto, accountId?: string): Promise<PaymentConfirmResponse> {
    const invoice = await this.billingRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) {
      throw new DomainError(`Không tìm thấy hóa đơn cần thanh toán: ${dto.invoiceId}`, 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === PaymentStatus.PAID) {
      throw new DomainError('Hóa đơn này đã được thanh toán đầy đủ trước đó.', 'INVOICE_ALREADY_PAID');
    }

    const paidAt = new Date();

    // 1. Ghi nhận bản ghi thanh toán (Payment Transaction)
    const payment = await this.billingRepository.createPayment({
      invoiceId: invoice.id,
      amount: invoice.total,
      method: 'CASH',
      paidAt,
    });

    // 2. Cập nhật trạng thái hóa đơn sang PAID
    const updatedInvoice = await this.billingRepository.updateInvoiceStatus(invoice.id, PaymentStatus.PAID);

    // 3. Ghi vết kiểm toán tài chính
    await this.billingRepository.createAudit({
      action: `PAYMENT_CASH_CONFIRMED: Thu tiền mặt số tiền ${invoice.total} VND. Ghi chú: ${dto.notes || 'Không'}`,
      entity: 'Invoice',
      entityId: invoice.id,
      accountId,
    });

    // 4. Mở quyền thực hiện CLS nếu hóa đơn này liên kết với một lệnh CLS
    let linkedOrderId: string | null = null;
    let linkedOrderStatus: string | null = null;

    if (this.clinicalServicesRepository) {
      const linkLog = await this.clinicalServicesRepository.findAuditLogByActionAndEntity(
        `CLS_INVOICE_LINK: Invoice ${invoice.id}`,
        'ClinicalOrder',
        '' // Sẽ tìm theo prefix
      );

      // Nếu tìm theo prefix, lấy entityId làm orderId
      const orderId = linkLog?.entityId;
      if (orderId) {
        linkedOrderId = orderId;
        const currentOrder = await this.clinicalServicesRepository.findOrderById(orderId);
        if (currentOrder && currentOrder.status === OrderStatus.AWAITING_PAYMENT) {
          await this.clinicalServicesRepository.updateOrderStatus(orderId, OrderStatus.READY);
          linkedOrderStatus = OrderStatus.READY;

          await this.clinicalServicesRepository.createAudit({
            action: `ORDER_ELIGIBLE_FOR_EXECUTION: Order ${orderId} chuyển sang READY sau khi hóa đơn ${invoice.id} PAID`,
            entity: 'ClinicalOrder',
            entityId: orderId,
            accountId,
          });
        } else if (currentOrder) {
          linkedOrderStatus = currentOrder.status;
        }
      }
    }

    return {
      payment: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
      },
      invoice: {
        id: updatedInvoice.id,
        visitId: updatedInvoice.visitId,
        total: updatedInvoice.total,
        status: PaymentStatus.PAID,
      },
      orderId: linkedOrderId,
      orderStatus: linkedOrderStatus,
      message: 'Xác nhận thu tiền mặt thành công. Hóa đơn đã chuyển sang trạng thái ĐÃ THANH TOÁN.',
    };
  }

  async getInvoiceByOrderId(orderId: string): Promise<InvoiceDto | null> {
    if (!this.clinicalServicesRepository) return null;
    const invoice = await this.clinicalServicesRepository.findLinkedInvoiceForOrder(orderId);
    if (!invoice) return null;
    return {
      id: invoice.id,
      visitId: invoice.visitId,
      total: invoice.total,
      status: invoice.status,
      orderId,
      payments: invoice.payments,
    };
  }
}
