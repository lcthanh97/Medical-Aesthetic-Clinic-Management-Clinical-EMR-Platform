import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../../../src/server/services/BillingService';
import type { IBillingRepository } from '../../../src/server/repositories/IBillingRepository';
import type { IClinicalServicesRepository } from '../../../src/server/repositories/IClinicalServicesRepository';
import { DomainError } from '../../../src/domain/errors/DomainError';
import { PaymentStatus, OrderStatus } from '../../../src/domain/enums';

describe('CLS-04: BillingService Unit Tests (Thanh toán tiền mặt CASH & Tạo hóa đơn CLS)', () => {
  let mockBillingRepo: IBillingRepository;
  let mockClsRepo: IClinicalServicesRepository;
  let billingService: BillingService;

  beforeEach(() => {
    mockBillingRepo = {
      findInvoiceById: vi.fn(),
      createInvoice: vi.fn(),
      updateInvoiceStatus: vi.fn(),
      createPayment: vi.fn(),
      findPaymentsByInvoiceId: vi.fn(),
      createAudit: vi.fn(),
      findAuditLogByActionAndEntity: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
    } as any;

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

  it('nên xác nhận thanh toán tiền mặt thành công, chuyển Invoice sang PAID và kích hoạt CLS READY', async () => {
    const mockInvoice = {
      id: 'inv-123',
      visitId: 'visit-456',
      total: 350000,
      status: PaymentStatus.UNPAID,
    };

    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue(mockInvoice);
    vi.mocked(mockBillingRepo.createPayment).mockResolvedValue({
      id: 'pay-01',
      invoiceId: 'inv-123',
      amount: 350000,
      method: 'CASH',
      paidAt: new Date('2026-11-04T10:00:00Z'),
    });
    vi.mocked(mockBillingRepo.updateInvoiceStatus).mockResolvedValue({
      ...mockInvoice,
      status: PaymentStatus.PAID,
    });

    // Mock link audit log để liên kết hóa đơn với CLS order
    vi.mocked(mockClsRepo.findAuditLogByActionAndEntity).mockResolvedValue({
      id: 'log-01',
      entityId: 'order-01',
      action: 'CLS_INVOICE_LINK: Invoice inv-123',
    });
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      status: OrderStatus.AWAITING_PAYMENT,
    });

    const result = await billingService.confirmCashPayment({
      invoiceId: 'inv-123',
      notes: 'Bệnh nhân thanh toán đủ tiền mặt tại quầy',
    });

    expect(result.invoice.status).toBe(PaymentStatus.PAID);
    expect(result.payment.amount).toBe(350000);
    expect(result.payment.method).toBe('CASH');
    expect(result.orderStatus).toBe(OrderStatus.READY);
    expect(mockClsRepo.updateOrderStatus).toHaveBeenCalledWith('order-01', OrderStatus.READY);
    expect(mockBillingRepo.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('PAYMENT_CASH_CONFIRMED'),
        entity: 'Invoice',
        entityId: 'inv-123',
      })
    );
  });

  it('nên ném INVOICE_NOT_FOUND nếu mã hóa đơn không tồn tại', async () => {
    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue(null);

    await expect(
      billingService.confirmCashPayment({ invoiceId: 'non-existent' })
    ).rejects.toMatchObject({ code: 'INVOICE_NOT_FOUND' });
  });

  it('nên chặn thanh toán lặp (INVOICE_ALREADY_PAID) nếu hóa đơn đã được thanh toán trước đó', async () => {
    const mockPaidInvoice = {
      id: 'inv-123',
      visitId: 'visit-456',
      total: 350000,
      status: PaymentStatus.PAID,
    };

    vi.mocked(mockBillingRepo.findInvoiceById).mockResolvedValue(mockPaidInvoice);

    await expect(
      billingService.confirmCashPayment({ invoiceId: 'inv-123' })
    ).rejects.toMatchObject({ code: 'INVOICE_ALREADY_PAID' });
  });

  it('nên tạo hóa đơn riêng cho lệnh chỉ định CLS và liên kết qua audit log', async () => {
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-01',
      status: OrderStatus.CREATED,
    });
    vi.mocked(mockClsRepo.findLinkedInvoiceForOrder).mockResolvedValue(null);
    vi.mocked(mockBillingRepo.createInvoice).mockResolvedValue({
      id: 'inv-new',
      visitId: 'visit-01',
      total: 250000,
      status: PaymentStatus.UNPAID,
    });

    const invoice = await billingService.createClsInvoice('order-01', [
      { serviceCode: 'CLS_SKIN_ANALYSIS', serviceName: 'Soi da', price: 150000 },
      { serviceCode: 'CLS_WOOD_LIGHT', serviceName: 'Soi đèn Wood', price: 100000 },
    ]);

    expect(invoice.id).toBe('inv-new');
    expect(invoice.total).toBe(250000);
    expect(invoice.status).toBe(PaymentStatus.UNPAID);
    expect(mockClsRepo.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('CLS_INVOICE_LINK'),
        entity: 'ClinicalOrder',
        entityId: 'order-01',
      })
    );
  });
});
