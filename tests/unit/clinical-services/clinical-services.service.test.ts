import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicalServicesService } from '../../../src/server/services/ClinicalServicesService';
import type { IClinicalServicesRepository } from '../../../src/server/repositories/IClinicalServicesRepository';
import type { IBillingService } from '../../../src/server/services/IBillingService';
import { DomainError } from '../../../src/domain/errors/DomainError';
import { OrderStatus, PaymentStatus } from '../../../src/domain/enums';

describe('CLS-04: ClinicalServicesService Full Lifecycle Tests (Order -> Invoice -> Payment -> Execution Guard -> Results)', () => {
  let mockClsRepo: IClinicalServicesRepository;
  let mockBillingService: Partial<IBillingService>;
  let service: ClinicalServicesService;

  beforeEach(() => {
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
      getServicesCatalog: vi.fn().mockResolvedValue([
        { code: 'CLS_CBC', name: 'Tổng phân tích tế bào máu ngoại vi', price: 180000, type: 'LABORATORY' },
        { code: 'CLS_SKIN_ANALYSIS', name: 'Soi da chuyên sâu kỹ thuật số 3D', price: 150000, type: 'IMAGING' },
      ]),
      getServiceByCode: vi.fn(),
    };

    mockBillingService = {
      createClsInvoice: vi.fn().mockResolvedValue({
        id: 'inv-cls-01',
        visitId: 'visit-123',
        total: 330000,
        status: PaymentStatus.UNPAID,
        orderId: 'order-01',
      }),
      confirmCashPayment: vi.fn(),
      getById: vi.fn(),
      getList: vi.fn(),
      getInvoiceByOrderId: vi.fn(),
    };

    service = new ClinicalServicesService(mockClsRepo, mockBillingService as IBillingService);
  });

  it('1. Bác sĩ tạo lệnh chỉ định CLS -> Lấy catalog từ Repository DB, Trạng thái AWAITING_PAYMENT & tự động lập hóa đơn UNPAID qua BillingService', async () => {
    vi.mocked(mockClsRepo.createOrder).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.AWAITING_PAYMENT,
    });

    const result = await service.createOrder({
      visitId: 'visit-123',
      type: 'LABORATORY',
      services: [
        { serviceCode: 'CLS_CBC', notes: 'Xét nghiệm công thức máu' },
        { serviceCode: 'CLS_SKIN_ANALYSIS', notes: 'Soi da bã nhờn' },
      ],
    });

    expect(result.id).toBe('order-01');
    expect(result.status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(result.invoiceId).toBe('inv-cls-01');
    expect(result.isPaid).toBe(false);
    expect(result.canExecute).toBe(false);
    expect(mockClsRepo.getServicesCatalog).toHaveBeenCalled();
    expect(mockBillingService.createClsInvoice).toHaveBeenCalledWith(
      'order-01',
      expect.any(Array),
      undefined
    );
  });

  it('2. Kỹ thuật viên cố bắt đầu thực hiện CLS khi hóa đơn CHƯA THANH TOÁN (UNPAID) -> BỊ CHẶN VỚI CLS_PAYMENT_REQUIRED', async () => {
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.AWAITING_PAYMENT,
    });

    vi.mocked(mockClsRepo.findLinkedInvoiceForOrder).mockResolvedValue({
      id: 'inv-cls-01',
      visitId: 'visit-123',
      total: 330000,
      status: PaymentStatus.UNPAID, // Chưa thanh toán!
      payments: [],
    });

    await expect(service.startExecution('order-01')).rejects.toThrow(DomainError);
    await expect(service.startExecution('order-01')).rejects.toMatchObject({
      code: 'CLS_PAYMENT_REQUIRED',
    });
    expect(mockClsRepo.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('3. Khi hóa đơn ĐÃ THANH TOÁN (PAID) -> Cho phép Kỹ thuật viên bắt đầu và chuyển trạng thái sang IN_PROGRESS', async () => {
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.READY, // Đã được kích hoạt sang READY sau khi thu ngân xác nhận tiền
    });

    vi.mocked(mockClsRepo.findLinkedInvoiceForOrder).mockResolvedValue({
      id: 'inv-cls-01',
      visitId: 'visit-123',
      total: 330000,
      status: PaymentStatus.PAID, // Đã thanh toán!
      payments: [{ amount: 330000, method: 'CASH', paidAt: new Date() }],
    });

    vi.mocked(mockClsRepo.updateOrderStatus).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.IN_PROGRESS,
      labResults: [],
      imagingResults: [],
    });

    const result = await service.startExecution('order-01');

    expect(result.status).toBe(OrderStatus.IN_PROGRESS);
    expect(mockClsRepo.updateOrderStatus).toHaveBeenCalledWith('order-01', OrderStatus.IN_PROGRESS);
    expect(mockClsRepo.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('START_CLS_EXECUTION'),
        entityId: 'order-01',
      })
    );
  });

  it('4. Kỹ thuật viên ghi nhận kết quả xét nghiệm / soi da -> Hoàn tất lệnh CLS và chuyển sang COMPLETED', async () => {
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.IN_PROGRESS, // Đang thực hiện
    });

    vi.mocked(mockClsRepo.updateOrderStatus).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.COMPLETED,
      labResults: [
        { id: 'lab-01', testName: 'WBC (Bạch cầu)', result: '7.5', unit: 'G/L' },
      ],
      imagingResults: [],
    });

    const result = await service.submitResults('order-01', {
      labResults: [{ testName: 'WBC (Bạch cầu)', result: '7.5', unit: 'G/L' }],
    });

    expect(result.status).toBe(OrderStatus.COMPLETED);
    expect(mockClsRepo.createLabResult).toHaveBeenCalledWith({
      orderId: 'order-01',
      testName: 'WBC (Bạch cầu)',
      result: '7.5',
      unit: 'G/L',
    });
    expect(mockClsRepo.updateOrderStatus).toHaveBeenCalledWith('order-01', OrderStatus.COMPLETED);
  });

  it('5. Chặn ghi nhận kết quả nếu lệnh chưa bắt đầu thực hiện (chưa ở trạng thái IN_PROGRESS)', async () => {
    vi.mocked(mockClsRepo.findOrderById).mockResolvedValue({
      id: 'order-01',
      visitId: 'visit-123',
      type: 'LABORATORY',
      status: OrderStatus.AWAITING_PAYMENT, // Chưa thanh toán / chưa bắt đầu
    });

    await expect(
      service.submitResults('order-01', {
        labResults: [{ testName: 'WBC', result: '7.0' }],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ORDER_STATUS' });
  });

  it('6. Lấy danh mục dịch vụ CLS từ Database qua Repository', async () => {
    const catalog = await service.getCatalog();
    expect(catalog).toHaveLength(2);
    expect(catalog[0].code).toBe('CLS_CBC');
    expect(mockClsRepo.getServicesCatalog).toHaveBeenCalled();
  });
});
