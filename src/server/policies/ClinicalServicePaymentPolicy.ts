import { prisma } from '@/infrastructure/database/prisma';

export interface PaymentPolicyResult {
  canPerform: boolean;
  reason?: string;
  orderId: string;
  orderStatus?: string;
  invoiceId?: string;
  invoiceStatus?: string;
}

export class ClinicalServicePaymentPolicy {
  /**
   * Kiểm tra điều kiện thanh toán trước khi thực hiện dịch vụ cận lâm sàng hoặc thủ thuật điều trị.
   * Quy tắc nghiệp vụ: Dịch vụ chỉ được phép thực hiện khi đã thanh toán (Order status là PAID/COMPLETED hoặc Invoice status là PAID).
   */
  async canPerform(orderId: string): Promise<PaymentPolicyResult> {
    try {
      const order = await prisma.clinicalOrder.findUnique({
        where: { id: orderId },
        include: {
          invoiceItems: {
            include: { invoice: true }
          }
        }
      });

      if (!order) {
        return {
          canPerform: false,
          reason: 'Không tìm thấy đơn chỉ định cận lâm sàng / thủ thuật.',
          orderId
        };
      }

      // 1. Nếu trạng thái chỉ định đã được đánh dấu là PAID hoặc COMPLETED/READY
      const statusUpper = (order.status || '').toUpperCase().trim();
      const validStatuses = ['PAID', 'COMPLETED', 'READY', 'DONE', 'HOÀN THÀNH', 'ĐÃ THANH TOÁN'];
      if (validStatuses.includes(statusUpper)) {
        return {
          canPerform: true,
          orderId,
          orderStatus: order.status
        };
      }

      // 2. Kiểm tra hóa đơn viện phí liên kết
      const paidInvoiceItem = order.invoiceItems.find(item => {
        const invStatus = (item.invoice?.status || '').toUpperCase().trim();
        return ['PAID', 'ĐÃ THANH TOÁN', 'COMPLETED'].includes(invStatus);
      });
      if (paidInvoiceItem && paidInvoiceItem.invoice) {
        return {
          canPerform: true,
          orderId,
          orderStatus: order.status,
          invoiceId: paidInvoiceItem.invoice.id,
          invoiceStatus: paidInvoiceItem.invoice.status
        };
      }

      // 3. Nếu chưa thanh toán
      const latestInvoice = order.invoiceItems[0]?.invoice;
      return {
        canPerform: false,
        reason: `Dịch vụ chưa được xác nhận thanh toán viện phí (Trạng thái đơn: ${order.status}, Hóa đơn: ${latestInvoice?.status || 'Chưa lập hóa đơn'}).`,
        orderId,
        orderStatus: order.status,
        invoiceId: latestInvoice?.id,
        invoiceStatus: latestInvoice?.status || 'UNPAID'
      };
    } catch (error: any) {
      return {
        canPerform: false,
        reason: `Lỗi kiểm tra quy tắc thanh toán: ${error.message}`,
        orderId
      };
    }
  }

  /**
   * Kiểm tra tính hợp lệ của phân bổ thanh toán cho hóa đơn
   */
  validateInvoicePayment(invoiceTotal: number, totalPaid: number): { isFullyPaid: boolean; balanceRemaining: number } {
    const balanceRemaining = Math.max(0, invoiceTotal - totalPaid);
    return {
      isFullyPaid: balanceRemaining === 0 && totalPaid >= invoiceTotal,
      balanceRemaining
    };
  }
}

export const clinicalServicePaymentPolicy = new ClinicalServicePaymentPolicy();

