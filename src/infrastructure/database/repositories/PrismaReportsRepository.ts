import type { IReportsRepository } from '@/server/repositories/IReportsRepository';
import { prisma } from '@/infrastructure/database/prisma';

export class PrismaReportsRepository implements IReportsRepository {
  async getInventoryAndRevenueReport(startDate: Date, endDate: Date) {
    const payments = await prisma.payment.findMany({ where: { paidAt: { gte: startDate, lte: endDate } }, select: { amount: true, paidAt: true }, orderBy: { paidAt: 'asc' } });

    // Decimal của Prisma không truyền được sang Client Component → chuyển sang number.
    const toPlain = <T extends { stock: unknown; unitCost: unknown; minStock: unknown }>(item: T) => ({
      ...item, stock: Number(item.stock), unitCost: Number(item.unitCost), minStock: Number(item.minStock),
    });
    const medicines = (await prisma.medicine.findMany({ orderBy: { name: 'asc' } })).map(toPlain);
    const supplies = (await prisma.supply.findMany({ orderBy: { name: 'asc' } })).map(toPlain);

    return {
      revenue: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      paymentCount: payments.length,
      revenueByDay: Object.values(payments.reduce<Record<string,{date:string;amount:number}>>((days,payment)=>{const date=payment.paidAt.toISOString().slice(0,10);days[date]??={date,amount:0};days[date].amount+=Number(payment.amount);return days},{})),
      inventory: {
        medicines,
        supplies,
      },
    };
  }
}
