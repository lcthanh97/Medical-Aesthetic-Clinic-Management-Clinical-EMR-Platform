import type { IReportsRepository } from '@/server/repositories/IReportsRepository';
import { prisma } from '@/infrastructure/database/prisma';

export class PrismaReportsRepository implements IReportsRepository {
  async getInventoryAndRevenueReport(startDate: Date, endDate: Date) {
    const revenue = await prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const medicines = await prisma.medicine.findMany();
    const supplies = await prisma.supply.findMany();

    return {
      revenue: revenue._sum.amount || 0,
      inventory: {
        medicines,
        supplies,
      },
    };
  }
}
