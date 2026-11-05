import type { IReportsRepository } from '@/server/repositories/IReportsRepository';
import type { IReportsService } from './IReportsService';

export class ReportsService implements IReportsService {
  constructor(private readonly repository: IReportsRepository) {}
  
  getInventoryAndRevenueReport(startDate: Date, endDate: Date) {
    return this.repository.getInventoryAndRevenueReport(startDate, endDate);
  }
}
