import type { IBillingRepository } from '@/server/repositories/IBillingRepository';
import type { IClinicalServicesRepository } from '@/server/repositories/IClinicalServicesRepository';
import type { IBillingService } from './IBillingService';
import { VNPayService } from '@/server/common/vnpay';
import { DomainError } from '@/domain/errors/DomainError';
import { PaymentStatus, OrderStatus } from '@/domain/enums';
import type {
  CashPaymentDto,
  InvoiceDto,
  PaymentConfirmResponse,
  InvoiceItemDetail,
  BillingSummaryDto,
  BillingItemDetail,
  CreateVNPayPaymentDto,
  VNPayPaymentResponse,
} from '@/features/billing/types/billing.types';

// Bảng giá thuốc chuẩn da liễu (fallback đơn giá khi không có trong cấu hình kho)
const DEFAULT_MEDICINE_PRICES: Record<string, number> = {
  isotretinoin: 180000,
  doxycycline: 95000,
  erythromycin: 75000,
  adapalene: 125000,
  klenzit: 135000,
  fucidin: 85000,
  dermovate: 90000,
  cetaphil: 160000,
};

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
   * BIL-01: Tổng hợp toàn bộ chi phí cuối lượt khám bệnh.
   * RÀNG BUỘC CỐT LÕI: Phân biệt rõ khoản phải thu lần này và khoản CLS đã trả trước.
   * TUYỆT ĐỐI KHÔNG CỘNG KHOẢN ĐÃ TRẢ TRƯỚC VÀO SỐ TIỀN PHẢI THU (amountDue).
   */
  async getVisitBillingSummary(visitId: string): Promise<BillingSummaryDto> {
    const visit = await this.billingRepository.findVisitWithDetails(visitId);
    if (!visit) {
      throw new DomainError(`Không tìm thấy lượt khám: ${visitId}`, 'VISIT_NOT_FOUND');
    }

    const items: BillingItemDetail[] = [];

    // 1. Phí công khám bệnh ban đầu (EXAMINATION)
    const examinationFee = 150000;
    items.push({
      id: `fee-exam-${visit.id}`,
      category: 'EXAMINATION',
      name: 'Tiền công khám bệnh & Tư vấn da liễu chuyên sâu',
      quantity: 1,
      unitPrice: examinationFee,
      totalPrice: examinationFee,
      isPrepaid: false,
    });

    // 2. Chi phí thuốc theo đơn bác sĩ kê (MEDICATION)
    let medicationFee = 0;
    if (visit.prescriptions && visit.prescriptions.length > 0) {
      for (const rx of visit.prescriptions) {
        if (rx.items && rx.items.length > 0) {
          for (const item of rx.items) {
            const medName = item.medicine?.name || 'Thuốc điều trị';
            const qty = Number(item.quantity) || 1;
            const price = this.getMedicineUnitPrice(medName);
            const lineTotal = qty * price;
            medicationFee += lineTotal;

            items.push({
              id: `med-${item.id}`,
              category: 'MEDICATION',
              name: `Thuốc: ${medName}`,
              quantity: qty,
              unitPrice: price,
              totalPrice: lineTotal,
              isPrepaid: false,
              referenceId: rx.id,
              dosage: item.dosage,
            });
          }
        }
      }
    }

    // 3. Chi phí thủ thuật phát sinh (nếu có trong lượt khám)
    const procedureFee = 0;

    // 4. Các khoản Cận lâm sàng (CLS) ĐÃ THANH TOÁN TRƯỚC (CLS-04 Integration)
    // Lấy thông tin từ các hóa đơn của visit đã thanh toán
    let prepaidAmount = 0;
    if (visit.invoices && visit.invoices.length > 0) {
      for (const inv of visit.invoices) {
        if (inv.status === PaymentStatus.PAID) {
          // Kiểm tra xem hóa đơn này có phải thuộc CLS Order không
          const isClsOrder = await this.billingRepository.findAuditLogByActionAndEntity(
            `CLS_INVOICE_LINK: Invoice ${inv.id}`,
            'ClinicalOrder',
            ''
          );

          if (isClsOrder) {
            const total = Number(inv.total);
            prepaidAmount += total;
            items.push({
              id: `cls-prepaid-${inv.id}`,
              category: 'PREPAID_CLS',
              name: `Dịch vụ Cận lâm sàng (Đã thanh toán trước qua HĐ ${inv.id})`,
              quantity: 1,
              unitPrice: total,
              totalPrice: total,
              isPrepaid: true, // ĐÃ TRẢ TRƯỚC!
              referenceId: isClsOrder.entityId,
            });
          }
        }
      }
    }

    // TỔNG TIỀN PHẢI THU LẦN NÀY: Khám + Thuốc + Thủ thuật chưa thu (Không cộng CLS đã trả trước)
    const amountDue = examinationFee + medicationFee + procedureFee;
    const totalExpense = amountDue + prepaidAmount;

    // Tra cứu hóa đơn cuối đã lập (nếu có)
    const existingFinalInvoice = await this.billingRepository.findFinalInvoiceForVisit(visitId);

    return {
      visitId: visit.id,
      patientId: visit.patient?.id,
      patientName: visit.patient?.fullName,
      doctorName: visit.employee?.fullName,
      visitDate: visit.visitDate instanceof Date ? visit.visitDate.toISOString() : String(visit.visitDate),
      items,
      examinationFee,
      medicationFee,
      procedureFee,
      prepaidAmount,
      amountDue,
      totalExpense,
      finalInvoiceId: existingFinalInvoice?.id || null,
      finalInvoiceStatus: existingFinalInvoice?.status || null,
    };
  }

  /**
   * BIL-01: Lập/chốt hóa đơn cuối lượt khám (Final Invoice).
   * Tạo bản ghi Invoice với total = amountDue (loại trừ các khoản CLS đã trả trước).
   * Đảm bảo Idempotency (chống tạo hóa đơn trùng lặp).
   */
  async finalizeVisitInvoice(visitId: string, accountId?: string): Promise<InvoiceDto> {
    const summary = await this.getVisitBillingSummary(visitId);

    // 1. Kiểm tra hóa đơn cuối đã tồn tại chưa (Idempotency)
    const existingFinalInvoice = await this.billingRepository.findFinalInvoiceForVisit(visitId);
    if (existingFinalInvoice) {
      // Nếu hóa đơn chưa thanh toán và có thay đổi tiền (ví dụ cập nhật đơn thuốc), cập nhật lại total
      if (existingFinalInvoice.status === PaymentStatus.UNPAID && existingFinalInvoice.total !== summary.amountDue) {
        await this.billingRepository.updateInvoiceTotal(existingFinalInvoice.id, summary.amountDue);
      }

      return {
        id: existingFinalInvoice.id,
        visitId: existingFinalInvoice.visitId,
        total: summary.amountDue,
        status: existingFinalInvoice.status,
        isFinalInvoice: true,
      };
    }

    // 2. Tạo hóa đơn cuối mới ở trạng thái UNPAID
    const createdInvoice = await this.billingRepository.createInvoice({
      visitId,
      total: summary.amountDue,
      status: PaymentStatus.UNPAID,
    });

    // 3. Đánh dấu liên kết hóa đơn cuối qua AuditLog
    await this.billingRepository.createAudit({
      action: `FINAL_VISIT_INVOICE_LINK: Invoice ${createdInvoice.id}`,
      entity: 'Visit',
      entityId: visitId,
      accountId: createdInvoice.id,
    });

    // 4. Lưu snapshot bảng kê chi tiết vào AuditLog
    await this.billingRepository.createAudit({
      action: `FINAL_INVOICE_SUMMARY_SNAPSHOT: ${JSON.stringify(summary.items)}`,
      entity: 'Invoice',
      entityId: createdInvoice.id,
      accountId,
    });

    return {
      id: createdInvoice.id,
      visitId: createdInvoice.visitId,
      total: summary.amountDue,
      status: PaymentStatus.UNPAID,
      isFinalInvoice: true,
    };
  }

  /**
   * BIL-02: Xác nhận thu tiền mặt (CASH) từ bệnh nhân cho hóa đơn cuối hoặc hóa đơn dịch vụ.
   * Cập nhật trạng thái Invoice -> PAID, ghi nhận giao dịch Payment,
   * đồng thời tự động cập nhật đơn thuốc của lượt khám sang PAID (sẵn sàng cấp phát thuốc).
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

    // 1 & 2. Giao dịch nguyên tử: Ghi nhận thanh toán CASH và cập nhật hóa đơn sang PAID (ACID consistent)
    const { payment, invoice: updatedInvoice } = await this.billingRepository.recordPaymentAndUpdateInvoice(
      {
        invoiceId: invoice.id,
        amount: invoice.total,
        method: 'CASH',
        paidAt,
      },
      PaymentStatus.PAID
    );

    // 3. Ghi vết kiểm toán tài chính
    await this.billingRepository.createAudit({
      action: `PAYMENT_CASH_CONFIRMED: Thu tiền mặt ${invoice.total} VND. Ghi chú: ${dto.notes || 'Không'}`,
      entity: 'Invoice',
      entityId: invoice.id,
      accountId,
    });

    // 4. Kích hoạt liên kết nếu là hóa đơn CLS
    let linkedOrderId: string | null = null;
    let linkedOrderStatus: string | null = null;
    if (this.clinicalServicesRepository) {
      const linkLog = await this.clinicalServicesRepository.findAuditLogByActionAndEntity(
        `CLS_INVOICE_LINK: Invoice ${invoice.id}`,
        'ClinicalOrder',
        ''
      );
      if (linkLog?.entityId) {
        linkedOrderId = linkLog.entityId;
        const currentOrder = await this.clinicalServicesRepository.findOrderById(linkLog.entityId);
        if (currentOrder && currentOrder.status === OrderStatus.AWAITING_PAYMENT) {
          await this.clinicalServicesRepository.updateOrderStatus(linkLog.entityId, OrderStatus.READY);
          linkedOrderStatus = OrderStatus.READY;
        }
      }
    }

    // 5. Kích hoạt cập nhật đơn thuốc của lượt khám sang PAID (Sẵn sàng cấp phát thuốc)
    let prescriptionsUpdated = 0;
    const visit = await this.billingRepository.findVisitWithDetails(invoice.visitId);
    if (visit?.prescriptions && visit.prescriptions.length > 0) {
      for (const rx of visit.prescriptions) {
        await this.billingRepository.updatePrescriptionStatus(rx.id, 'PAID');
        prescriptionsUpdated++;
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
      prescriptionsUpdated,
      message: 'Xác nhận thu tiền mặt thành công. Hóa đơn và đơn thuốc đã chuyển sang trạng thái ĐÃ THANH TOÁN.',
    };
  }

  /**
   * BIL-02: Khởi tạo giao dịch thanh toán VNPay Sandbox.
   * Sinh URL thanh toán VNPay có chữ ký HMAC-SHA512.
   */
  async createVNPayPayment(dto: CreateVNPayPaymentDto, clientIp?: string): Promise<VNPayPaymentResponse> {
    const invoice = await this.billingRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) {
      throw new DomainError(`Không tìm thấy hóa đơn cần thanh toán: ${dto.invoiceId}`, 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === PaymentStatus.PAID) {
      throw new DomainError('Hóa đơn này đã được thanh toán trước đó.', 'INVOICE_ALREADY_PAID');
    }

    const { paymentUrl, txnRef } = VNPayService.buildPaymentUrl({
      invoiceId: invoice.id,
      amount: invoice.total,
      orderInfo: `Thanh toan hoa don y te ${invoice.id}`,
      ipAddr: clientIp,
      bankCode: dto.bankCode,
      locale: dto.language,
    });

    return {
      paymentUrl,
      transactionRef: txnRef,
      amount: invoice.total,
      message: 'Khởi tạo giao dịch VNPay Sandbox thành công. Vui lòng chuyển hướng đến cổng thanh toán.',
    };
  }

  /**
   * BIL-02: Xác minh kết quả thanh toán từ VNPay Sandbox (Return URL hoặc IPN Webhook).
   * Kiểm tra chữ ký HMAC-SHA512, cập nhật hóa đơn sang PAID và mở khóa cấp phát thuốc.
   */
  async verifyVNPayCallback(queryParams: Record<string, string>, accountId?: string): Promise<PaymentConfirmResponse> {
    const { isValid, invoiceId, responseCode } = VNPayService.verifyReturnUrl(queryParams);

    if (!isValid) {
      throw new DomainError('Chữ ký bảo mật VNPay không hợp lệ (Checksum failed).', 'VNPAY_INVALID_SIGNATURE');
    }

    if (!invoiceId) {
      throw new DomainError('Mã hóa đơn không tồn tại trong giao dịch VNPay.', 'VNPAY_MISSING_INVOICE');
    }

    const invoice = await this.billingRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new DomainError(`Không tìm thấy hóa đơn: ${invoiceId}`, 'INVOICE_NOT_FOUND');
    }

    if (responseCode !== '00') {
      throw new DomainError(`Giao dịch VNPay không thành công hoặc bị hủy (Mã phản hồi: ${responseCode}).`, 'VNPAY_PAYMENT_FAILED');
    }

    // Chống xử lý trùng lặp (Idempotency) nếu IPN hoặc Return đã cập nhật trước đó
    if (invoice.status === PaymentStatus.PAID) {
      const existingPayments = await this.billingRepository.findPaymentsByInvoiceId(invoice.id);
      const vnpPayment = existingPayments.find((p) => p.method === 'VNPAY') || existingPayments[0];

      return {
        payment: {
          id: vnpPayment?.id || 'vnp-existing',
          invoiceId: invoice.id,
          amount: vnpPayment?.amount || invoice.total,
          method: 'VNPAY',
          paidAt: vnpPayment?.paidAt ? new Date(vnpPayment.paidAt).toISOString() : new Date().toISOString(),
        },
        invoice: {
          id: invoice.id,
          visitId: invoice.visitId,
          total: invoice.total,
          status: PaymentStatus.PAID,
        },
        message: 'Giao dịch VNPay đã được ghi nhận thành công trước đó.',
      };
    }

    const paidAt = new Date();

    // 1 & 2. Giao dịch nguyên tử: Tạo bản ghi thanh toán VNPAY và cập nhật hóa đơn sang PAID (ACID consistent)
    const { payment, invoice: updatedInvoice } = await this.billingRepository.recordPaymentAndUpdateInvoice(
      {
        invoiceId: invoice.id,
        amount: invoice.total,
        method: 'VNPAY',
        paidAt,
      },
      PaymentStatus.PAID
    );

    // 3. Ghi vết kiểm toán
    await this.billingRepository.createAudit({
      action: `PAYMENT_VNPAY_CONFIRMED: Thanh toán qua VNPay Sandbox ${invoice.total} VND. TxnRef: ${queryParams.vnp_TxnRef}`,
      entity: 'Invoice',
      entityId: invoice.id,
      accountId,
    });

    // 4. Kích hoạt liên kết nếu là hóa đơn CLS (Luồng thanh toán trước CLS - CLS-04)
    let linkedOrderId: string | null = null;
    let linkedOrderStatus: string | null = null;
    if (this.clinicalServicesRepository) {
      const linkLog = await this.clinicalServicesRepository.findAuditLogByActionAndEntity(
        `CLS_INVOICE_LINK: Invoice ${invoice.id}`,
        'ClinicalOrder',
        ''
      );
      if (linkLog?.entityId) {
        linkedOrderId = linkLog.entityId;
        const currentOrder = await this.clinicalServicesRepository.findOrderById(linkLog.entityId);
        if (currentOrder && currentOrder.status === OrderStatus.AWAITING_PAYMENT) {
          await this.clinicalServicesRepository.updateOrderStatus(linkLog.entityId, OrderStatus.READY);
          linkedOrderStatus = OrderStatus.READY;
        }
      }
    }

    // 5. Kích hoạt cập nhật đơn thuốc của lượt khám sang PAID (sẵn sàng cấp phát thuốc)
    let prescriptionsUpdated = 0;
    const visit = await this.billingRepository.findVisitWithDetails(invoice.visitId);
    if (visit?.prescriptions && visit.prescriptions.length > 0) {
      for (const rx of visit.prescriptions) {
        await this.billingRepository.updatePrescriptionStatus(rx.id, 'PAID');
        prescriptionsUpdated++;
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
      prescriptionsUpdated,
      message: 'Xác nhận thanh toán qua VNPay thành công. Hóa đơn và trạng thái dịch vụ đã được cập nhật.',
    };
  }

  /**
   * Tạo hóa đơn riêng cho lệnh chỉ định Cận lâm sàng (CLS-04).
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

    const items: InvoiceItemDetail[] = services.map((s) => ({
      serviceCode: s.serviceCode,
      serviceName: s.serviceName || s.serviceCode,
      price: s.price ?? 0,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    const createdInvoice = await this.billingRepository.createInvoice({
      visitId: order.visitId,
      total: totalAmount,
      status: PaymentStatus.UNPAID,
    });

    await this.clinicalServicesRepository.createAudit({
      action: `CLS_INVOICE_LINK: Invoice ${createdInvoice.id}`,
      entity: 'ClinicalOrder',
      entityId: orderId,
      accountId: createdInvoice.id,
    });

    await this.billingRepository.createAudit({
      action: `CLS_INVOICE_ITEMS_SNAPSHOT: ${JSON.stringify(items)}`,
      entity: 'Invoice',
      entityId: createdInvoice.id,
      accountId,
    });

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

  private getMedicineUnitPrice(medicineName: string): number {
    const lower = medicineName.toLowerCase();
    for (const key of Object.keys(DEFAULT_MEDICINE_PRICES)) {
      if (lower.includes(key)) {
        return DEFAULT_MEDICINE_PRICES[key];
      }
    }
    return 100000; // Đơn giá mặc định cho thuốc da liễu
  }
}
