import type { AuthActor } from '@/server/services/AuthService';
import type { IReportsService } from '@/server/services/IReportsService';
import { ReportsMapper } from '@/server/mappers/ReportsMapper';
import { ReportsValidator } from '@/server/validators/ReportsValidator';

export class ReportsController {
  constructor(
    private readonly service: IReportsService,
    private readonly validator = new ReportsValidator(),
  ) {}

  getDashboard(actor: AuthActor, input: unknown) {
    return this.service.getDashboardReport(actor, this.validator.parseFilters(input));
  }

  async exportCsv(actor: AuthActor, input: unknown) {
    const report = await this.service.getDashboardReport(actor, this.validator.parseFilters(input), true);
    return ReportsMapper.toCsv(report);
  }
}
