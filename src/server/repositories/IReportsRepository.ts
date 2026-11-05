export interface IReportsRepository {
  getInventoryAndRevenueReport(startDate: Date, endDate: Date): Promise<{
    revenue: any;
    inventory: any;
  }>;
}
