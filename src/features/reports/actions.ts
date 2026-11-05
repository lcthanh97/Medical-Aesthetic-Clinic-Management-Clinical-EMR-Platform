'use server';

import { PrismaReportsRepository } from '@/infrastructure/database/repositories/PrismaReportsRepository';
import { ReportsService } from '@/server/services/ReportsService';

const repository = new PrismaReportsRepository();
const service = new ReportsService(repository);

export async function getInventoryAndRevenueReport(startDate: Date, endDate: Date) {
  try {
    const data = await service.getInventoryAndRevenueReport(startDate, endDate);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
