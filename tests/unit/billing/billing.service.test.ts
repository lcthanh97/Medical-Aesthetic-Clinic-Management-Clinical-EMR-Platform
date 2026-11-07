import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../../../src/server/services/BillingService';
import type { IBillingRepository } from '../../../src/server/repositories/IBillingRepository';
import type { IClinicalServicesRepository } from '../../../src/server/repositories/IClinicalServicesRepository';
import { PaymentStatus, OrderStatus } from '../../../src/domain/enums';
import { VNPayService } from '../../../src/server/common/vnpay';

describe('BIL-01 & BIL-02: BillingService Unit Tests (Final Invoice & Multi-channel Payments)', () => {
  let mockBillingRepo: IBillingRepository;
  let mockClsRepo: IClinicalServicesRepository;
  let billingService: BillingService;

  beforeEach(() => {
    mockBillingRepo = {
      findInvoiceById: vi.fn(),
      createInvoice: vi.fn(),
      updateInvoiceStatus: vi.fn(),
      updateInvoiceTotal: vi.fn(),
      createPayment: vi.fn(),
      findPaymentsByInvoiceId: vi.fn(),
      createAudit: vi.fn(),
      findAuditLogByActionAndEntity: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      findVisitWithDetails: vi.fn(),
      findFinalInvoiceForVisit: vi.fn(),
      findInvoicesByVisitId: vi.fn(),
      updatePrescriptionStatus: vi.fn(),
      recordPaymentAndUpdateInvoice: vi.fn().mockImplementation(async (input, status) => ({
        payment: {
          id: 'pay-mock-01',
          invoiceId: input.invoiceId,
          amount: input.amount,
          method: input.method,
          paidAt: input.paidAt,
        },
        invoice: {
          id: input.invoiceId,
          visitId: 'visit-01',
          total: input.amount,
          status,
        },
      })),
    };

    mockClsRepo = {
      createOrder: vi.fn(),
      findOrderById: vi.fn(),
      findOrdersByVisitId: vi.fn(),
      updateOrderStatus: vi.fn(),
      createLabResult: vi.fn(),
      createImagingResult: vi.fn(),
      findLinkedInvoiceForOrder: vi.fn(),
      createAudit: vi.fn(),
      findAuditLogByActionAndEntity: vi.fn(),
      getServicesCatalog: vi.fn(),
      getServiceByCode: vi.fn(),
    };

    billingService = new BillingService(mockBillingRepo, mockClsRepo);
  });

  describe('BIL-01: Lập hóa đơn cuối lượt & Bảng kê chi phí (Loại trừ CLS trả trước)', () => {
    it('1. Bảng kê chi phí tổng hợp: Tiền khám + Tiền thuốc kê đơn, LOẠI TRỪ khoản CLS đã trả trước', async () => {
      // Mock dữ liệu lượt khám có:
      // - 1 đơn thuốc với 2 hộp Isotretinoin (2 * 180.000 = 360.000 đ)
      // - 1 hóa đơn CLS đã thanh toán trước (250.000 đ - PAID)
      vi.mocked(mockBillingRepo.findVisitWithDetails).mockResolvedValue({
        id: 'visit-01',
        visitDate: new Date('2026-11-04'),
        patient: { id: 'pat-01', fullName: 'Trần Thị Mai' },
        employee: { id: 'emp-01', fullName: 'BS. Lê Hữu Trác' },
        prescriptions: [
          {
            id: 'rx-01',
            status: 'PENDING',
            items: [
              {
                id: 'rx-item-1',
                quantity: 2,
                dosage: 'Uống 1 viên sau ăn tối',
                medicine: { name: 'Isotretinoin 20mg' },
              },
            ],
          },
        ],
        invoices: [
          {
            id: 'inv-cls-prepaid',
            total: 250000,
            status: PaymentStatus.PAID,
          },
        ],
      });

      // Mock phát hiện hóa đơn CLS đã trả trước qua AuditLog
      vi.mocked(mockBillingRepo.findAuditLogByActionAndEntity).mockResolvedValue({
        id: 'log-cls',
        entity: 'ClinicalOrder',
        entityId: 'ord-cls-01',
        action: 'CLS_INVOICE_LINK: Invoice inv-cls-prepaid',
      });

      vi.mocked(mockBillingRepo.findFinalInvoiceForVisit).mockResolvedValue(null);

      const summary = await billingService.getVisitBillingSummary('visit-01');

      // Khám: 150.000 đ + Thuốc: 360.000 đ = 510.000 đ
      expect(summary.examinationFee).toBe(150000);
      expect(summary.medicationFee).toBe(360000);
      expect(summary.prepaidAmount).toBe(250000); // Khoản CLS đã trả trước
      expect(summary.amountDue).toBe(510000); // SỐ TIỀN CẦN THU LẦN NÀY (Không cộng 250.000đ!)
      expect(summary.totalExpense).toBe(760000); // Tổng chi phí toàn bộ quá trình

      // Item CLS phải có cờ isPrepaid = true
      const prepaidItem = summary.items.find((i) => i.category === 'PREPAID_CLS');
      expect(prepaidItem).toBeDefined();
      expect(prepaidItem?.isPrepaid).toBe(true);
      expect(prepaidItem?.totalPrice).toBe(250000);
    });

    it('2. Lập hóa đơn cuối lượt (Finalize Invoice): Tạo invoice mới với total = amountDue và chống tạo trùng', async () => {
      // Mock chưa có hóa đơn cuối
      vi.mocked(mockBillingRepo.findVisitWithDetails).mockResolvedValue({
        id: 'visit-01',
        visitDate: new Date(),
        prescriptions: [],
        invoices: [],
      });
      vi.mocked(mockBillingRepo.findFinalInvoiceForVisit).mockResolvedValue(null);
      vi.mocked(mockBillingRepo.createInvoice).mockResolvedValue({
        id: 'inv-final-01',
        visitId: 'visit-01',
        total: 150000, // Chỉ có tiền khám
        status: PaymentStatus.UNPAID,
      });

      const invoice = await billingService.finalizeVisitInvoice('visit-01');

      expect(invoice.id).toBe('inv-final-01');
      expect(invoice.total).toBe(150000);
      expect(invoice.status).toBe(PaymentStatus.UNPAID);
      expect(mockBillingRepo.createInvoice).toHaveBeenCalledWith({
        visitId: 'visit-01',
        total: 150000,
        status: PaymentStatus.UNPAID,
      });
      expect(mockBillingRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringContaining('FINAL_VISIT_INVOICE_LINK'),
          entity: 'Visit',
          entityId: 'visit-01',
        })
      );
    });
  });

  describe('BIL-02: Thanh toán Tiền mặt (CASH) & Kích hoạt cấp phát thuốc', () => {
    it('3. Xác nhận thu tiền mặt -> Invoice chuyển PAID và Đơn thuốc chuyển PAID (sẵn sàng cấp phát)', async () => {
      const mockInvoice = {
        id: 'inv-final-01',
        visitId: 'visit-01',
        total: 510000,
        status: PaymentStatus.UNPAID,
      };

      vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue(mockInvoice);
      vi.mocked(mockBillingRepo.createPayment).mockResolvedValue({
        id: 'pay-cash-01',
        invoiceId: 'inv-final-01',
        amount: 510000,
        method: 'CASH',
        paidAt: new Date(),
      });
      vi.mocked(mockBillingRepo.updateInvoiceStatus).mockResolvedValue({
        ...mockInvoice,
        status: PaymentStatus.PAID,
      });
      vi.mocked(mockBillingRepo.findVisitWithDetails).mockResolvedValue({
        id: 'visit-01',
        prescriptions: [{ id: 'rx-01', status: 'PENDING' }],
      });

      const result = await billingService.confirmCashPayment({
        invoiceId: 'inv-final-01',
        amountReceived: 510000,
      });

      expect(result.invoice.status).toBe(PaymentStatus.PAID);
      expect(result.payment.method).toBe('CASH');
      expect(result.prescriptionsUpdated).toBe(1);
      expect(mockBillingRepo.updatePrescriptionStatus).toHaveBeenCalledWith('rx-01', 'PAID');
    });

    it('4. Chặn thanh toán tiền mặt trùng lặp nếu hóa đơn đã được thanh toán', async () => {
      vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
        id: 'inv-final-01',
        visitId: 'visit-01',
        total: 510000,
        status: PaymentStatus.PAID,
      });

      await expect(
        billingService.confirmCashPayment({ invoiceId: 'inv-final-01' })
      ).rejects.toMatchObject({ code: 'INVOICE_ALREADY_PAID' });
    });
  });

  describe('BIL-02: Thanh toán VNPay Sandbox', () => {
    it('5. Khởi tạo thanh toán VNPay Sandbox -> Sinh URL có chứa chữ ký HMAC-SHA512', async () => {
      vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
        id: 'inv-final-01',
        visitId: 'visit-01',
        total: 510000,
        status: PaymentStatus.UNPAID,
      });

      const result = await billingService.createVNPayPayment(
        { invoiceId: 'inv-final-01', bankCode: 'NCB' },
        '127.0.0.1'
      );

      expect(result.paymentUrl).toContain('sandbox.vnpayment.vn');
      expect(result.paymentUrl).toContain('vnp_SecureHash=');
      expect(result.paymentUrl).toContain('vnp_BankCode=NCB');
      expect(result.amount).toBe(510000);
    });

    it('6. Xác minh VNPay Callback thành công (ResponseCode 00) -> Invoice và Đơn thuốc chuyển PAID', async () => {
      // Dùng VNPayService để sinh query params có chữ ký thật hợp lệ
      const { txnRef } = VNPayService.buildPaymentUrl({
        invoiceId: 'inv-vnp-01',
        amount: 510000,
        orderInfo: 'Thanh toan test',
      });

      // Giả lập callback thành công từ VNPay với chữ ký chuẩn
      const callbackQuery: Record<string, string> = {
        vnp_Amount: '51000000',
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_Command: 'pay',
        vnp_CreateDate: '20261104200000',
        vnp_CurrCode: 'VND',
        vnp_OrderInfo: 'Thanh toan test',
        vnp_PayDate: '20261104200500',
        vnp_ResponseCode: '00', // Thành công
        vnp_TmnCode: '2QXUI4B4',
        vnp_TransactionNo: '14567890',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: txnRef,
        vnp_Version: '2.1.0',
      };

      // Tự ký HMAC-SHA512 cho callbackQuery
      callbackQuery.vnp_SecureHash = VNPayService.createSecureHash(callbackQuery);

      vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
        id: 'inv-vnp-01',
        visitId: 'visit-01',
        total: 510000,
        status: PaymentStatus.UNPAID,
      });

      vi.mocked(mockBillingRepo.createPayment).mockResolvedValue({
        id: 'pay-vnp-01',
        invoiceId: 'inv-vnp-01',
        amount: 510000,
        method: 'VNPAY',
        paidAt: new Date(),
      });

      vi.mocked(mockBillingRepo.updateInvoiceStatus).mockResolvedValue({
        id: 'inv-vnp-01',
        visitId: 'visit-01',
        total: 510000,
        status: PaymentStatus.PAID,
      });

      vi.mocked(mockBillingRepo.findVisitWithDetails).mockResolvedValue({
        id: 'visit-01',
        prescriptions: [{ id: 'rx-02', status: 'PENDING' }],
      });

      const result = await billingService.verifyVNPayCallback(callbackQuery);

      expect(result.invoice.status).toBe(PaymentStatus.PAID);
      expect(result.payment.method).toBe('VNPAY');
      expect(result.prescriptionsUpdated).toBe(1);
      expect(mockBillingRepo.updatePrescriptionStatus).toHaveBeenCalledWith('rx-02', 'PAID');
    });

    it('7. Xác minh VNPay Callback cho hóa đơn CLS (CLS-04) -> Invoice chuyển PAID và Lệnh CLS chuyển READY', async () => {
      const { txnRef } = VNPayService.buildPaymentUrl({
        invoiceId: 'inv-cls-01',
        amount: 250000,
        orderInfo: 'Thanh toan CLS',
      });

      const callbackQuery: Record<string, string> = {
        vnp_Amount: '25000000',
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_Command: 'pay',
        vnp_CreateDate: '20261104200000',
        vnp_CurrCode: 'VND',
        vnp_OrderInfo: 'Thanh toan CLS',
        vnp_PayDate: '20261104200500',
        vnp_ResponseCode: '00',
        vnp_TmnCode: '2QXUI4B4',
        vnp_TransactionNo: '14567891',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: txnRef,
        vnp_Version: '2.1.0',
      };
      callbackQuery.vnp_SecureHash = VNPayService.createSecureHash(callbackQuery);

      vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
        id: 'inv-cls-01',
        visitId: 'visit-01',
        total: 250000,
        status: PaymentStatus.UNPAID,
      });

      vi.mocked(mockBillingRepo.createPayment).mockResolvedValue({
        id: 'pay-cls-01',
        invoiceId: 'inv-cls-01',
        amount: 250000,
        method: 'VNPAY',
        paidAt: new Date(),
      });

      vi.mocked(mockBillingRepo.updateInvoiceStatus).mockResolvedValue({
        id: 'inv-cls-01',
        visitId: 'visit-01',
        total: 250000,
        status: PaymentStatus.PAID,
      });

      // Giả lập liên kết CLS_INVOICE_LINK
      vi.mocked(mockClsRepo.findAuditLogByActionAndEntity).mockResolvedValue({
        id: 'audit-cls-01',
        entityId: 'ord-cls-01',
        entity: 'ClinicalOrder',
        action: 'CLS_INVOICE_LINK: Invoice inv-cls-01',
        createdAt: new Date(),
      });

      vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
        id: 'ord-cls-01',
        visitId: 'visit-01',
        type: 'LABORATORY',
        status: OrderStatus.AWAITING_PAYMENT,
      });

      const result = await billingService.verifyVNPayCallback(callbackQuery);

      expect(result.invoice.status).toBe(PaymentStatus.PAID);
      expect(result.payment.method).toBe('VNPAY');
      expect(result.orderId).toBe('ord-cls-01');
      expect(result.orderStatus).toBe(OrderStatus.READY);
      expect(mockClsRepo.updateOrderStatus).toHaveBeenCalledWith('ord-cls-01', OrderStatus.READY);
    });

    it('8. Chặn VNPay callback nếu chữ ký bị giả mạo (Checksum failed)', async () => {
      const fakeQuery: Record<string, string> = {
        vnp_Amount: '51000000',
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'inv-01_123',
        vnp_SecureHash: 'fake_hash_value_123456',
      };

      await expect(
        billingService.verifyVNPayCallback(fakeQuery)
      ).rejects.toMatchObject({ code: 'VNPAY_INVALID_SIGNATURE' });
    });
  });
});
