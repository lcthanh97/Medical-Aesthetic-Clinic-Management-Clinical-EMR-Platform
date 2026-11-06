import { prisma } from '@/infrastructure/database/prisma';
import type {
  IClinicalServicesRepository,
  CreateOrderInput,
  CreateLabResultInput,
  CreateImagingResultInput,
  ClsCatalogService,
} from '@/server/repositories/IClinicalServicesRepository';

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

  async getServicesCatalog(): Promise<ClsCatalogService[]> {
    const services = await prisma.serviceCatalog.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return services.map((service) => ({
      code: service.code,
      name: service.name,
      price: Number(service.basePrice),
      type: service.category.toUpperCase().includes('IMAG') ? 'IMAGING' : 'LABORATORY',
      description: service.category,
    }));
  }

  async getServiceByCode(code: string): Promise<ClsCatalogService | null> {
    const service = await prisma.serviceCatalog.findUnique({ where: { code } });
    if (!service || !service.active) return null;
    return {
      code: service.code,
      name: service.name,
      price: Number(service.basePrice),
      type: service.category.toUpperCase().includes('IMAG') ? 'IMAGING' : 'LABORATORY',
      description: service.category,
    };
  }
}
