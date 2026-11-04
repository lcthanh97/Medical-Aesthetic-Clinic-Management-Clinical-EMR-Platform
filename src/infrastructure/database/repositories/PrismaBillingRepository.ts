import { prisma } from '@/infrastructure/database/prisma';
import type { IBillingRepository, CreateInvoiceInput, CreatePaymentInput } from '@/server/repositories/IBillingRepository';

export class PrismaBillingRepository implements IBillingRepository {
  async findById(id: string): Promise<any | null> {
    return this.findInvoiceById(id);
  }

  async findMany(): Promise<any[]> {
    const list = await prisma.invoice.findMany({
      include: {
        payments: true,
      },
      orderBy: { id: 'desc' },
    });
    return list.map((inv) => ({
      ...inv,
      total: Number(inv.total),
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
}
