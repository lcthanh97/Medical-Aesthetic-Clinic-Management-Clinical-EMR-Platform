import { prisma } from '@/infrastructure/database/prisma';
import type {
  IBillingRepository,
  CreateInvoiceInput,
  CreatePaymentInput,
} from '@/server/repositories/IBillingRepository';

export class PrismaBillingRepository implements IBillingRepository {
  async findById(id: string): Promise<any | null> {
    return this.findInvoiceById(id);
  }

  async findMany(): Promise<any[]> {
    const list = await prisma.invoice.findMany({
      include: {
        payments: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    return list.map((inv) => ({
      ...inv,
      total: Number(inv.total),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    }));
  }

  async findInvoiceById(id: string): Promise<any | null> {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: true,
        visit: {
          include: {
            patient: true,
            prescriptions: {
              include: {
                items: {
                  include: {
                    medicine: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!inv) return null;
    return {
      ...inv,
      total: Number(inv.total),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }

  async createInvoice(input: CreateInvoiceInput): Promise<any> {
    const created = await prisma.invoice.create({
      data: {
        visitId: input.visitId,
        total: input.total,
        status: input.status,
      },
      include: {
        payments: true,
      },
    });
    return {
      ...created,
      total: Number(created.total),
    };
  }

  async updateInvoiceStatus(id: string, status: string): Promise<any> {
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: { payments: true },
    });
    return {
      ...updated,
      total: Number(updated.total),
    };
  }

  async updateInvoiceTotal(id: string, total: number): Promise<any> {
    const updated = await prisma.invoice.update({
      where: { id },
      data: { total },
      include: { payments: true },
    });
    return {
      ...updated,
      total: Number(updated.total),
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<any> {
    const created = await prisma.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
      },
    });
    return {
      ...created,
      amount: Number(created.amount),
    };
  }

  async findPaymentsByInvoiceId(invoiceId: string): Promise<any[]> {
    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' },
    });
    return payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    }));
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
      console.warn('AuditLog creation warning in BillingRepository:', err);
    }
  }

  async findAuditLogByActionAndEntity(actionPrefix: string, entity: string, entityId: string): Promise<any | null> {
    return prisma.auditLog.findFirst({
      where: {
        entity,
        entityId: entityId || undefined,
        action: {
          startsWith: actionPrefix,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findVisitWithDetails(visitId: string): Promise<any | null> {
    return prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
        employee: true,
        prescriptions: {
          include: {
            items: {
              include: {
                medicine: true,
              },
            },
          },
        },
        orders: true,
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });
  }

  async findInvoicesByVisitId(visitId: string): Promise<any[]> {
    const list = await prisma.invoice.findMany({
      where: { visitId },
      include: { payments: true },
      orderBy: { id: 'asc' },
    });
    return list.map((inv) => ({
      ...inv,
      total: Number(inv.total),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    }));
  }

  async findFinalInvoiceForVisit(visitId: string): Promise<any | null> {
    // 1. Tìm hóa đơn được đánh dấu là Hóa đơn cuối lượt qua AuditLog
    const linkLog = await prisma.auditLog.findFirst({
      where: {
        entity: 'Visit',
        entityId: visitId,
        action: {
          startsWith: 'FINAL_VISIT_INVOICE_LINK:',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (linkLog && linkLog.accountId) {
      return this.findInvoiceById(linkLog.accountId);
    }

    // 2. Fallback: Lấy hóa đơn của visit mà KHÔNG phải là hóa đơn CLS
    const allInvoices = await this.findInvoicesByVisitId(visitId);
    for (const inv of allInvoices) {
      const isClsLink = await prisma.auditLog.findFirst({
        where: {
          entity: 'ClinicalOrder',
          action: `CLS_INVOICE_LINK: Invoice ${inv.id}`,
        },
      });
      if (!isClsLink) {
        return inv;
      }
    }

    return null;
  }

  async updatePrescriptionStatus(prescriptionId: string, status: string): Promise<any> {
    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status },
    });
  }
}
