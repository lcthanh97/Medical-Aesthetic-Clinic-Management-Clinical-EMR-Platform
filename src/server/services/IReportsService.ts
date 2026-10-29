export interface IReportsService {
  getInventoryAndRevenueReport(startDate: Date, endDate: Date): Promise<{
    revenue: any;
    inventory: any;
  }>;
}
