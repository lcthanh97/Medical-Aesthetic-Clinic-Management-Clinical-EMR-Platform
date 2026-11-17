import { createHash, timingSafeEqual } from 'node:crypto';
import { prismaReminderStore, runFollowUpReminderJob, type ReminderStore } from '@/features/follow-ups/reminder-job';

export const runtime = 'nodejs';

function response(error: string, status: number) {
  return Response.json({ error }, { status });
}

export function authorizeReminderRequest(request: Request, secret: string | undefined): number | null {
  if (!secret?.trim()) return 503;
  const supplied = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  const actualHash = createHash('sha256').update(supplied ?? '').digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash) ? null : 401;
}

export function parseReminderRequest(url: string): { dryRun: boolean; asOf?: Date } | null {
  const params = new URL(url).searchParams;
  const dryRun = params.get('dryRun');
  const rawAsOf = params.get('asOf');
  if (dryRun !== null && dryRun !== '1') return null;
  if (rawAsOf && dryRun !== '1') return null;
  if (!rawAsOf) return { dryRun: dryRun === '1' };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(rawAsOf)) return null;
  const asOf = new Date(rawAsOf);
  return Number.isFinite(asOf.getTime()) ? { dryRun: true, asOf } : null;
}

export async function handleReminderRequest(request: Request, store: ReminderStore, secret: string | undefined) {
  const authorizationError = authorizeReminderRequest(request, secret);
  if (authorizationError === 503) return response('Chưa cấu hình CRON_SECRET.', 503);
  if (authorizationError === 401) return response('Không có quyền chạy tác vụ nhắc tái khám.', 401);
  const options = parseReminderRequest(request.url);
  if (!options) return response('Tham số dryRun hoặc asOf không hợp lệ; asOf chỉ dùng cùng dryRun=1.', 400);
  try {
    const result = await runFollowUpReminderJob(store, options);
    if (!result) return response('Đang có lần chạy nhắc tái khám khác.', 409);
    return Response.json(result);
  } catch {
    if (process.env.FOLLOWUP_DEBUG_LOG === 'true') console.error('[follow-up-reminder] RUN_ERROR');
    return response('Không thể chạy tác vụ nhắc tái khám lúc này.', 500);
  }
}

export const GET = (request: Request) => handleReminderRequest(request, prismaReminderStore, process.env.CRON_SECRET);
export const POST = GET;
