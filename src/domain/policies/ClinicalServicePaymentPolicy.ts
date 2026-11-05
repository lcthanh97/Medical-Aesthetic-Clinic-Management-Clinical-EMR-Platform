import { DomainError } from '@/domain/errors/DomainError';
import { PaymentStatus, OrderStatus } from '@/domain/enums';

export interface OrderPaymentCheckSubject {
  id: string;
  status: string;
  visitId: string;
}

export interface InvoicePaymentCheckSubject {
  id: string;
  status: string;
  total: number | string;
}

export class ClinicalServicePaymentPolicy {
  /**
   * Kiểm tra điều kiện tiên quyết bắt buộc trước khi Kỹ thuật viên / Bác sĩ bắt đầu thực hiện CLS.
   * Tuân thủ quy tắc 6.2 AGENTS.md:
   * "Dịch vụ Cận lâm sàng chỉ được phép thực hiện khi lệnh chỉ định (ClinicalOrder) đã được xác nhận thanh toán (PaymentStatus.PAID)"
   */
  static ensureOrderCanExecute(
    order: OrderPaymentCheckSubject | null,
    linkedInvoice: InvoicePaymentCheckSubject | null
  ): boolean {
    if (!order) {
      throw new DomainError('Không tìm thấy thông tin lệnh chỉ định cận lâm sàng.', 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new DomainError('Lệnh chỉ định cận lâm sàng đã bị hủy, không được phép thực hiện.', 'ORDER_CANCELLED');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new DomainError('Lệnh chỉ định cận lâm sàng đã được hoàn tất trước đó.', 'ORDER_ALREADY_COMPLETED');
    }

    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new DomainError('Lệnh chỉ định cận lâm sàng hiện đang trong quá trình thực hiện.', 'ORDER_ALREADY_IN_PROGRESS');
    }

    // Kiểm tra hóa đơn thanh toán liên kết
    if (!linkedInvoice) {
      throw new DomainError(
        'Lệnh chỉ định cận lâm sàng chưa có hóa đơn thanh toán hợp lệ trong hệ thống.',
        'INVOICE_NOT_FOUND'
      );
    }

    // BẮT BUỘC TRẠNG THÁI HÓA ĐƠN LÀ PAID
    if (linkedInvoice.status !== PaymentStatus.PAID) {
      throw new DomainError(
        'Bệnh nhân cần hoàn tất thanh toán trước khi thực hiện cận lâm sàng.',
        'CLS_PAYMENT_REQUIRED'
      );
    }

    return true;
  }
}
