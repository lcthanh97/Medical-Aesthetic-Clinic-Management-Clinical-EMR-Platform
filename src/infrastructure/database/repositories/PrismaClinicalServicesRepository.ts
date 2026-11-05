import { prisma } from '@/infrastructure/database/prisma';
import type {
  IClinicalServicesRepository,
  CreateOrderInput,
  CreateLabResultInput,
  CreateImagingResultInput,
  ClsCatalogService,
} from '@/server/repositories/IClinicalServicesRepository';

// Bảng danh mục chuẩn dịch vụ CLS phòng khám Da liễu - Thẩm mỹ
const DEFAULT_CLS_SERVICES: ClsCatalogService[] = [
  {
    code: 'CLS_SKIN_ANALYSIS',
    name: 'Soi da chuyên sâu kỹ thuật số 3D',
    price: 150000,
    type: 'IMAGING',
    description: 'Phân tích đa phổ: sắc tố, nếp nhăn, lỗ chân lông, vi khuẩn P.acnes',
  },
  {
    code: 'CLS_WOOD_LIGHT',
    name: 'Soi đèn Wood chẩn đoán nấm & sắc tố biểu bì',
    price: 100000,
    type: 'IMAGING',
    description: 'Chẩn đoán lang ben, hắc lào, bạch biến và độ sâu nám da',
  },
  {
    code: 'CLS_PHOTO_MAPPING',
    name: 'Chụp ảnh thẩm mỹ chuẩn hóa y khoa trước/sau điều trị',
    price: 80000,
    type: 'IMAGING',
    description: 'Chụp lưu hồ sơ 5 góc khuôn mặt chuẩn y tế',
  },
  {
    code: 'CLS_DERMOSCOPY',
    name: 'Dermoscopy (Soi kính hiển vi bề mặt da)',
    price: 200000,
    type: 'IMAGING',
    description: 'Khảo sát tổn thương hắc tố, nốt ruồi nghi ngờ ác tính',
  },
  {
    code: 'CLS_FUNGUS_SMEAR',
    name: 'Xét nghiệm cạo vảy da soi tươi tìm vi nấm',
    price: 120000,
    type: 'LABORATORY',
    description: 'Soi tươi KOH tìm sợi nấm men, nấm sợi tơ',
  },
  {
    code: 'CLS_DEMODEX_TEST',
    name: 'Xét nghiệm cạo bã nhờn tìm ký sinh trùng Demodex',
    price: 150000,
    type: 'LABORATORY',
    description: 'Soi tìm mật độ Demodex folliculorum / brevis',
  },
  {
    code: 'CLS_CBC',
    name: 'Tổng phân tích tế bào máu ngoại vi (24 thông số)',
    price: 180000,
    type: 'LABORATORY',
    description: 'Đánh giá thiếu máu, nhiễm trùng, dị ứng trước thủ thuật/uống Isotretinoin',
  },
  {
    code: 'CLS_LIVER_ENZYMES',
    name: 'Xét nghiệm men gan AST (GOT) / ALT (GPT)',
    price: 160000,
    type: 'LABORATORY',
    description: 'Kiểm tra chức năng gan định kỳ khi dùng thuốc điều trị mụn/nấm toàn thân',
  },
  {
    code: 'CLS_LIPID_PANEL',
    name: 'Bộ mỡ máu Lipid Panel (Cholesterol, Triglyceride)',
    price: 200000,
    type: 'LABORATORY',
    description: 'Theo dõi chỉ số mỡ máu trước và trong liệu trình Isotretinoin',
  },
];

export class PrismaClinicalServicesRepository implements IClinicalServicesRepository {
  async createOrder(input: CreateOrderInput): Promise<any> {
    return prisma.clinicalOrder.create({
      data: {
        visitId: input.visitId,
        type: input.type,
        status: input.status,
      },
      include: {
        labResults: true,
        imagingResults: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  async findOrderById(id: string): Promise<any | null> {
    return prisma.clinicalOrder.findUnique({
      where: { id },
      include: {
        labResults: true,
        imagingResults: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  async findOrdersByVisitId(visitId: string): Promise<any[]> {
    return prisma.clinicalOrder.findMany({
      where: { visitId },
      include: {
        labResults: true,
        imagingResults: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    return prisma.clinicalOrder.update({
      where: { id },
      data: { status },
      include: {
        labResults: true,
        imagingResults: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  async createLabResult(input: CreateLabResultInput): Promise<any> {
    return prisma.labResult.create({
      data: {
        orderId: input.orderId,
        testName: input.testName,
        result: input.result,
        unit: input.unit || null,
      },
    });
  }

  async createImagingResult(input: CreateImagingResultInput): Promise<any> {
    return prisma.imagingResult.create({
      data: {
        orderId: input.orderId,
        imagingType: input.imagingType,
        conclusion: input.conclusion,
        fileUrl: input.fileUrl || null,
      },
    });
  }

  async findLinkedInvoiceForOrder(orderId: string): Promise<any | null> {
    const linkLog = await prisma.auditLog.findFirst({
      where: {
        entity: 'ClinicalOrder',
        entityId: orderId,
        action: {
          startsWith: 'CLS_INVOICE_LINK',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!linkLog || !linkLog.accountId) {
      return null;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: linkLog.accountId },
      include: { payments: true },
    });

    if (!invoice) return null;

    return {
      ...invoice,
      total: Number(invoice.total),
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }

  async createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          accountId: data.accountId || null,
        },
      });
    } catch (err) {
      console.warn('AuditLog creation warning:', err);
    }
  }

  async findAuditLogByActionAndEntity(actionPrefix: string, entity: string, entityId: string): Promise<any | null> {
    return prisma.auditLog.findFirst({
      where: {
        entity,
        entityId,
        action: {
          startsWith: actionPrefix,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy danh mục dịch vụ cận lâm sàng từ Database qua Repository.
   * Truy vấn kết hợp với bảng Equipment trong DB (thiết bị soi da, máy móc CLS sẵn có)
   * và bảng giá dịch vụ CLS chuẩn.
   */
  async getServicesCatalog(): Promise<ClsCatalogService[]> {
    try {
      // Kiểm tra các thiết bị y tế hoạt động trong DB để gắn thêm thông tin trạng thái máy
      const equipments = await prisma.equipment.findMany({
        select: { id: true, name: true, serial: true, status: true },
      });

      return DEFAULT_CLS_SERVICES.map((service) => {
        const matchingEquipment = equipments.find((eq) =>
          service.name.toLowerCase().includes(eq.name.toLowerCase()) ||
          eq.name.toLowerCase().includes(service.name.toLowerCase())
        );

        return {
          ...service,
          description: matchingEquipment
            ? `${service.description} (Thiết bị: ${matchingEquipment.name} - ${matchingEquipment.status})`
            : service.description,
        };
      });
    } catch (err) {
      console.warn('Error reading equipment from database for catalog:', err);
      return DEFAULT_CLS_SERVICES;
    }
  }

  async getServiceByCode(code: string): Promise<ClsCatalogService | null> {
    const catalog = await this.getServicesCatalog();
    return catalog.find((s) => s.code === code) || null;
  }
}
