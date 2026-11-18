import { NextRequest } from 'next/server';
import { FollowUpDraftSchema } from '@/features/follow-ups/follow-ups.schema';
import { followUpActor, followUpError, followUpJson, followUpSameOrigin, followUpService, unauthenticated } from '@/server/services/FollowUpApi';

type Context = { params: Promise<{ visitId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const { visitId } = await context.params;
    return followUpJson({ success: true, data: await followUpService.getForVisit(actor, visitId) });
  } catch (error) { return followUpError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  if (!followUpSameOrigin(request)) return followUpJson({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const { visitId } = await context.params;
    const input = FollowUpDraftSchema.parse(await request.json());
    return followUpJson({ success: true, data: await followUpService.saveDraft(actor, visitId, input) });
  } catch (error) { return followUpError(error); }
}
