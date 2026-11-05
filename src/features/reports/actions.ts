'use server';

import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { PrismaReportsRepository } from '@/infrastructure/database/repositories/PrismaReportsRepository';
import { ReportsController } from '@/server/controllers/ReportsController';
import { AuthService } from '@/server/services/AuthService';
import { ReportsService } from '@/server/services/ReportsService';

const controller = new ReportsController(new ReportsService(new PrismaReportsRepository()));
const auth = new AuthService(new PrismaAuthRepository());

function isLocalReportsTestEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.REPORTS_TEST_MODE !== 'true') return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? '');
    return ['127.0.0.1', 'localhost'].includes(database.hostname)
      && database.port === '55432' && database.pathname === '/emr_test';
  } catch {
    return false;
  }
}

export async function getInventoryAndRevenueReport(startDate: Date, endDate: Date) {
  if (!isLocalReportsTestEnvironment()) {
    return { success: false as const, error: 'Report chỉ được bật trên PostgreSQL test localhost.' };
  }
  try {
    const actor = await auth.getSession((await cookies()).get('clinic_session')?.value);
    if (!actor) return { success: false as const, error: 'Vui lòng đăng nhập để tiếp tục.' };
    const data = await controller.getDashboard(actor, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    });
    return { success: true, data };
  } catch {
    return { success: false as const, error: 'Không thể tải báo cáo trong phạm vi được phép.' };
  }
}
