import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingController } from '../../../src/server/controllers/BillingController';
import { BillingService } from '../../../src/server/services/BillingService';
import type { IBillingRepository } from '../../../src/server/repositories/IBillingRepository';
import type { IClinicalServicesRepository } from '../../../src/server/repositories/IClinicalServicesRepository';
import { PaymentStatus } from '../../../src/domain/enums';
import { VNPayService, VNPAY_CONFIG } from '../../../src/server/common/vnpay';

describe('TASK: DEBUG & FIX – Billing Cash & VNPay Sandbox Comprehensive Tests', () => {
  let mockBillingRepo: IBillingRepository;
  let mockClsRepo: IClinicalServicesRepository;
  let billingService: BillingService;
  let billingController: BillingController;

  beforeEach(() => {
    VNPAY_CONFIG.tmnCode = 'MPYAWF14';
    VNPAY_CONFIG.hashSecret = 'VEGLVYOVSEMEYRLZNBOYUXVWNHAYJTXI';
    VNPAY_CONFIG.paymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    VNPAY_CONFIG.returnUrl = 'http://localhost:3000/api/payments/vnpay/return';

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
          id: 'pay-test-01',
          invoiceId: input.invoiceId,
          amount: input.amount,
          method: input.method,
          paidAt: input.paidAt,
        },
        invoice: {
          id: input.invoiceId,
          visitId: 'visit-test-01',
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
    billingController = new BillingController(billingService);
  });

  // 1. Cash – Thanh toán hợp lệ
  it('Cash – Thanh toán hợp lệ -> Giao dịch thành công, hóa đơn chuyển ĐÃ THANH TOÁN', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-valid-01',
      visitId: 'visit-01',
      total: 350000,
      status: 'CHỜ THANH TOÁN',
    });
    vi.mocked(mockBillingRepo.findVisitWithDetails).mockResolvedValue({
      id: 'visit-01',
      prescriptions: [{ id: 'rx-01', status: 'PENDING' }],
    });

    const res = await billingController.confirmCashPayment({
      invoiceId: 'inv-valid-01',
      amountReceived: 350000,
      notes: 'Thanh toán tiền mặt đủ',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.invoice.status).toBe(PaymentStatus.PAID);
    expect(res.body.data?.payment.method).toBe('CASH');
    expect(mockBillingRepo.recordPaymentAndUpdateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'inv-valid-01', amount: 350000, method: 'CASH' }),
      PaymentStatus.PAID
    );
  });

  // 2. Cash – Payload không hợp lệ
  it('Cash – Payload không hợp lệ -> Trả lỗi validation rõ ràng', async () => {
    const res = await billingController.confirmCashPayment({
      // missing invoiceId
      amountReceived: 350000,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(res.body.error?.details).toContain('invoiceId');
  });

  // 3. Cash – Hóa đơn đã thanh toán
  it('Cash – Hóa đơn đã thanh toán -> Không được tạo giao dịch trùng', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-paid-01',
      visitId: 'visit-01',
      total: 350000,
      status: PaymentStatus.PAID,
    });

    const res = await billingController.confirmCashPayment({
      invoiceId: 'inv-paid-01',
      amountReceived: 350000,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVOICE_ALREADY_PAID');
    expect(mockBillingRepo.recordPaymentAndUpdateInvoice).not.toHaveBeenCalled();
  });

  // 4. Cash – Lỗi lưu database
  it('Cash – Lỗi lưu database -> Không cập nhật sai trạng thái hóa đơn', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-db-err',
      visitId: 'visit-01',
      total: 350000,
      status: 'CHỜ THANH TOÁN',
    });
    vi.mocked(mockBillingRepo.recordPaymentAndUpdateInvoice).mockRejectedValue(
      new Error('Database write failure: connection reset')
    );

    const res = await billingController.confirmCashPayment({
      invoiceId: 'inv-db-err',
      amountReceived: 350000,
    });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INTERNAL_SERVER_ERROR');
  });

  // 5. VNPay – Khởi tạo thanh toán hợp lệ
  it('VNPay – Khởi tạo thanh toán hợp lệ -> Tạo URL VNPay Sandbox hợp lệ', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-vnp-01',
      visitId: 'visit-01',
      total: 500000,
      status: 'CHỜ THANH TOÁN',
    });

    const res = await billingController.createVNPayPayment({
      invoiceId: 'inv-vnp-01',
      bankCode: 'NCB',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.paymentUrl).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(res.body.data?.paymentUrl).toContain('vnp_SecureHash=');
    expect(res.body.data?.paymentUrl).toContain('vnp_BankCode=NCB');
  });

  // 6. VNPay – Người dùng thanh toán thành công
  it('VNPay – Người dùng thanh toán thành công -> Xác minh kết quả và cập nhật hóa đơn', async () => {
    const txnRef = 'inv-vnp-success_1730000000000';
    const callbackQuery: Record<string, string> = {
      vnp_Amount: '50000000',
      vnp_BankCode: 'NCB',
      vnp_Command: 'pay',
      vnp_CreateDate: '20261107090000',
      vnp_CurrCode: 'VND',
      vnp_OrderInfo: 'Thanh toan hoa don y te',
      vnp_ResponseCode: '00', // Thành công
      vnp_TmnCode: 'MPYAWF14',
      vnp_TxnRef: txnRef,
      vnp_Version: '2.1.0',
    };
    callbackQuery.vnp_SecureHash = VNPayService.createSecureHash(callbackQuery);

    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-vnp-success',
      visitId: 'visit-01',
      total: 500000,
      status: 'UNPAID',
    });

    const res = await billingController.handleVNPayCallback(callbackQuery);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.invoice.status).toBe(PaymentStatus.PAID);
    expect(res.body.data?.payment.method).toBe('VNPAY');
  });

  // 7. VNPay – Người dùng hủy thanh toán (ResponseCode khác 00)
  it('VNPay – Người dùng hủy thanh toán -> Giữ trạng thái hóa đơn phù hợp', async () => {
    const txnRef = 'inv-vnp-cancel_1730000000000';
    const callbackQuery: Record<string, string> = {
      vnp_Amount: '50000000',
      vnp_Command: 'pay',
      vnp_CreateDate: '20261107090000',
      vnp_CurrCode: 'VND',
      vnp_OrderInfo: 'Thanh toan hoa don y te',
      vnp_ResponseCode: '24', // Khách hàng hủy giao dịch
      vnp_TmnCode: 'MPYAWF14',
      vnp_TxnRef: txnRef,
      vnp_Version: '2.1.0',
    };
    callbackQuery.vnp_SecureHash = VNPayService.createSecureHash(callbackQuery);

    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-vnp-cancel',
      visitId: 'visit-01',
      total: 500000,
      status: 'UNPAID',
    });

    const res = await billingController.handleVNPayCallback(callbackQuery);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VNPAY_PAYMENT_FAILED');
    expect(mockBillingRepo.recordPaymentAndUpdateInvoice).not.toHaveBeenCalled();
  });

  // 8. VNPay – Chữ ký không hợp lệ
  it('VNPay – Chữ ký không hợp lệ -> Từ chối xác nhận giao dịch', async () => {
    const fakeQuery: Record<string, string> = {
      vnp_Amount: '50000000',
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'inv-fake_1730000000000',
      vnp_SecureHash: 'invalid-tampered-hash-string-that-fails-verification',
    };

    const res = await billingController.handleVNPayCallback(fakeQuery);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VNPAY_INVALID_SIGNATURE');
    expect(mockBillingRepo.recordPaymentAndUpdateInvoice).not.toHaveBeenCalled();
  });

  // 9. VNPay – Callback/IPN trùng
  it('VNPay – Callback/IPN trùng -> Không ghi nhận thanh toán hai lần', async () => {
    const txnRef = 'inv-duplicate_1730000000000';
    const callbackQuery: Record<string, string> = {
      vnp_Amount: '50000000',
      vnp_Command: 'pay',
      vnp_CreateDate: '20261107090000',
      vnp_CurrCode: 'VND',
      vnp_OrderInfo: 'Thanh toan hoa don y te',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'MPYAWF14',
      vnp_TxnRef: txnRef,
      vnp_Version: '2.1.0',
    };
    callbackQuery.vnp_SecureHash = VNPayService.createSecureHash(callbackQuery);

    // Hóa đơn đã ở trạng thái PAID
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-duplicate',
      visitId: 'visit-01',
      total: 500000,
      status: PaymentStatus.PAID,
    });
    vi.mocked(mockBillingRepo.findPaymentsByInvoiceId).mockResolvedValue([
      { id: 'pay-existing-vnp', invoiceId: 'inv-duplicate', amount: 500000, method: 'VNPAY', paidAt: new Date() },
    ]);

    const res = await billingController.handleVNPayCallback(callbackQuery);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('đã được ghi nhận thành công trước đó');
    expect(mockBillingRepo.recordPaymentAndUpdateInvoice).not.toHaveBeenCalled();
  });

  // 10. Payment Success Data Retrieval – Lấy đầy đủ thông tin hóa đơn đã thanh toán từ DB
  it('Payment Success – Lấy dữ liệu chi tiết hóa đơn, thông tin bệnh nhân và phương thức giao dịch', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue({
      id: 'inv-success-100',
      visitId: 'visit-100',
      total: 700000,
      status: PaymentStatus.PAID,
      createdAt: new Date('2026-11-07T09:00:00Z'),
      visit: {
        patient: {
          id: 'p-01',
          patientCode: 'BN2026-001',
          fullName: 'Nguyễn Văn An',
          phone: '0901234567',
        },
      },
      payments: [
        {
          id: 'pay-vnp-100',
          invoiceId: 'inv-success-100',
          amount: 700000,
          method: 'VNPAY',
          paidAt: new Date('2026-11-07T09:15:00Z'),
        },
      ],
    });

    vi.mocked(mockBillingRepo.findAuditLogByActionAndEntity).mockResolvedValue(null);

    const invoice = await billingService.getById('inv-success-100');

    expect(invoice).not.toBeNull();
    expect(invoice?.id).toBe('inv-success-100');
    expect(invoice?.status).toBe(PaymentStatus.PAID);
    expect(invoice?.patientName).toBe('Nguyễn Văn An');
    expect(invoice?.patientCode).toBe('BN2026-001');
    expect(invoice?.paymentMethod).toBe('VNPAY');
    expect(invoice?.transactionId).toBe('pay-vnp-100');
    expect(invoice?.total).toBe(700000);
    expect(invoice?.items).toBeDefined();
    expect(invoice?.items?.length).toBeGreaterThan(0);
  });
});
