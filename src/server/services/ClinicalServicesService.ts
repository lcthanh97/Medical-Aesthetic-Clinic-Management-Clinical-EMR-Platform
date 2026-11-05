import type {
  IClinicalServicesRepository,
  ClsCatalogService,
} from '@/server/repositories/IClinicalServicesRepository';
import type { IBillingService } from '@/server/services/IBillingService';
import type { IClinicalServicesService } from './IClinicalServicesService';
import { ClinicalServicePaymentPolicy } from '@/domain/policies/ClinicalServicePaymentPolicy';
import { DomainError } from '@/domain/errors/DomainError';
import { OrderStatus, PaymentStatus } from '@/domain/enums';
import type {
  CreateClinicalOrderDto,
  ClinicalOrderItem,
  SubmitResultsDto,
  ClsPaymentStatusResponse,
  ClsRequestedServiceItem,
} from '@/features/clinical-services/types/clinical-services.types';

export class ClinicalServicesService implements IClinicalServicesService {
  constructor(
    private readonly repository: IClinicalServicesRepository,
    private readonly billingService: IBillingService
  ) {}

  /**
   * Lấy danh mục dịch vụ cận lâm sàng từ Database qua Repository.
   */
  async getCatalog(): Promise<ClsCatalogService[]> {
    return this.repository.getServicesCatalog();
  }

  /**
   * Bác sĩ tạo lệnh chỉ định cận lâm sàng (CLS).
   * Lấy đơn giá dịch vụ từ Database qua Repository,
   * lưu lệnh ở trạng thái AWAITING_PAYMENT và tự động kích hoạt lập hóa đơn riêng qua BillingService.
   */
  async createOrder(dto: CreateClinicalOrderDto, accountId?: string): Promise<ClinicalOrderItem> {
    if (!dto.visitId) {
      throw new DomainError('Vui lòng chỉ định mã lượt khám (visitId).', 'INVALID_VISIT_ID');
    }

    if (!dto.services || dto.services.length === 0) {
      throw new DomainError('Lệnh chỉ định phải có ít nhất một dịch vụ cận lâm sàng.', 'EMPTY_SERVICES');
    }

    // 1. Lấy danh mục dịch vụ từ database qua repository để tra cứu giá và tên chính xác
    const catalog = await this.repository.getServicesCatalog();
    const catalogMap = new Map(catalog.map((s) => [s.code, s]));

    const servicesMapped: ClsRequestedServiceItem[] = dto.services.map((s) => {
      const found = catalogMap.get(s.serviceCode);
      return {
        serviceCode: s.serviceCode,
        serviceName: found?.name || s.serviceCode,
        price: found?.price ?? 0,
        notes: s.notes,
      };
    });

    // 2. Tạo lệnh chỉ định CLS trong database
    const order = await this.repository.createOrder({
      visitId: dto.visitId,
      type: dto.type || 'LABORATORY',
      status: OrderStatus.AWAITING_PAYMENT,
    });

    // 3. Tự động lập hóa đơn riêng cho lệnh chỉ định CLS này qua BillingService
    const invoice = await this.billingService.createClsInvoice(
      order.id,
      servicesMapped.map((s) => ({
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        price: s.price,
      })),
      accountId
    );

    // 4. Ghi vết kiểm toán
    await this.repository.createAudit({
      action: `CREATE_CLS_ORDER: Order ${order.id} tạo với ${servicesMapped.length} dịch vụ. Hóa đơn ${invoice.id} (UNPAID)`,
      entity: 'ClinicalOrder',
      entityId: order.id,
      accountId,
    });

    return {
      id: order.id,
      visitId: order.visitId,
      type: order.type,
      status: order.status,
      services: servicesMapped,
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      isPaid: false,
      canExecute: false,
      labResults: [],
      imagingResults: [],
    };
  }

  async getById(id: string): Promise<ClinicalOrderItem> {
    const order = await this.repository.findOrderById(id);
    if (!order) {
      throw new DomainError(`Không tìm thấy lệnh chỉ định: ${id}`, 'ORDER_NOT_FOUND');
    }

    const linkedInvoice = await this.repository.findLinkedInvoiceForOrder(id);
    const isPaid = linkedInvoice ? linkedInvoice.status === PaymentStatus.PAID : false;
    const canExecute = isPaid && (order.status === OrderStatus.READY || order.status === OrderStatus.AWAITING_PAYMENT);

    return {
      id: order.id,
      visitId: order.visitId,
      type: order.type,
      status: order.status,
      services: [],
      invoiceId: linkedInvoice?.id || null,
      invoiceStatus: linkedInvoice?.status || null,
      isPaid,
      canExecute,
      labResults: order.labResults || [],
      imagingResults: order.imagingResults || [],
    };
  }

  async getByVisitId(visitId: string): Promise<ClinicalOrderItem[]> {
    const orders = await this.repository.findOrdersByVisitId(visitId);
    const results: ClinicalOrderItem[] = [];

    for (const order of orders) {
      const linkedInvoice = await this.repository.findLinkedInvoiceForOrder(order.id);
      const isPaid = linkedInvoice ? linkedInvoice.status === PaymentStatus.PAID : false;
      const canExecute = isPaid && (order.status === OrderStatus.READY || order.status === OrderStatus.AWAITING_PAYMENT);

      results.push({
        id: order.id,
        visitId: order.visitId,
        type: order.type,
        status: order.status,
        services: [],
        invoiceId: linkedInvoice?.id || null,
        invoiceStatus: linkedInvoice?.status || null,
        isPaid,
        canExecute,
        labResults: order.labResults || [],
        imagingResults: order.imagingResults || [],
      });
    }

    return results;
  }

  async checkPaymentStatus(orderId: string): Promise<ClsPaymentStatusResponse> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) {
      throw new DomainError(`Không tìm thấy lệnh chỉ định: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    const invoice = await this.repository.findLinkedInvoiceForOrder(orderId);
    if (!invoice) {
      return {
        orderId,
        status: order.status,
        invoiceId: null,
        invoiceStatus: null,
        totalAmount: 0,
        isPaid: false,
        canExecute: false,
      };
    }

    const isPaid = invoice.status === PaymentStatus.PAID;
    const canExecute = isPaid && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.COMPLETED;

    return {
      orderId,
      status: order.status,
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      totalAmount: invoice.total,
      isPaid,
      canExecute,
    };
  }

  /**
   * Kỹ thuật viên bắt đầu thực hiện dịch vụ CLS.
   * KIỂM SOÁT BẮT BUỘC (GUARD):
   * Phải được xác nhận thanh toán (PAID) trước đó, nếu chưa sẽ bị chặn và ném DomainError.
   */
  async startExecution(orderId: string, accountId?: string): Promise<ClinicalOrderItem> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) {
      throw new DomainError(`Không tìm thấy lệnh chỉ định: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    // 1. Lấy thông tin hóa đơn liên kết
    const invoice = await this.repository.findLinkedInvoiceForOrder(orderId);

    // 2. KÍCH HOẠT POLICY THANH TOÁN BẮT BUỘC
    ClinicalServicePaymentPolicy.ensureOrderCanExecute(order, invoice);

    // 3. Chuyển trạng thái sang IN_PROGRESS
    const updated = await this.repository.updateOrderStatus(orderId, OrderStatus.IN_PROGRESS);

    // 4. Ghi vết kiểm toán
    await this.repository.createAudit({
      action: `START_CLS_EXECUTION: Kỹ thuật viên bắt đầu thực hiện dịch vụ cho Order ${orderId}`,
      entity: 'ClinicalOrder',
      entityId: orderId,
      accountId,
    });

    return {
      id: updated.id,
      visitId: updated.visitId,
      type: updated.type,
      status: updated.status,
      services: [],
      invoiceId: invoice?.id || null,
      invoiceStatus: invoice?.status || null,
      isPaid: true,
      canExecute: false,
      labResults: updated.labResults || [],
      imagingResults: updated.imagingResults || [],
    };
  }

  async submitResults(orderId: string, dto: SubmitResultsDto, accountId?: string): Promise<ClinicalOrderItem> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) {
      throw new DomainError(`Không tìm thấy lệnh chỉ định: ${orderId}`, 'ORDER_NOT_FOUND');
    }

    if (order.status !== OrderStatus.IN_PROGRESS && order.status !== OrderStatus.READY) {
      throw new DomainError(
        `Không thể nhập kết quả cho lệnh chỉ định đang ở trạng thái: ${order.status}`,
        'INVALID_ORDER_STATUS'
      );
    }

    // Lưu kết quả xét nghiệm (Lab) nếu có
    if (dto.labResults && dto.labResults.length > 0) {
      for (const lab of dto.labResults) {
        await this.repository.createLabResult({
          orderId,
          testName: lab.testName,
          result: lab.result,
          unit: lab.unit,
        });
      }
    }

    // Lưu kết quả hình ảnh / soi da nếu có
    if (dto.imagingResults && dto.imagingResults.length > 0) {
      for (const img of dto.imagingResults) {
        await this.repository.createImagingResult({
          orderId,
          imagingType: img.imagingType,
          conclusion: img.conclusion,
          fileUrl: img.fileUrl,
        });
      }
    }

    // Cập nhật trạng thái lệnh sang COMPLETED
    const completed = await this.repository.updateOrderStatus(orderId, OrderStatus.COMPLETED);

    await this.repository.createAudit({
      action: `COMPLETE_CLS_ORDER: Order ${orderId} đã hoàn tất và nhập đầy đủ kết quả`,
      entity: 'ClinicalOrder',
      entityId: orderId,
      accountId,
    });

    return {
      id: completed.id,
      visitId: completed.visitId,
      type: completed.type,
      status: completed.status,
      services: [],
      invoiceId: null,
      invoiceStatus: null,
      isPaid: true,
      canExecute: false,
      labResults: completed.labResults || [],
      imagingResults: completed.imagingResults || [],
    };
  }
}
