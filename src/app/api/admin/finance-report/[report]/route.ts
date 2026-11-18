import { getStaffSession } from '@/server/auth/staff-session';
import { createFinanceReportHandler } from '@/features/finance-report/handler';
import * as reports from '@/features/finance-report/service';

const handle = createFinanceReportHandler(async () => Boolean(await getStaffSession('admin')), reports);

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  return handle(request, (await params).report);
}
