import { NextRequest } from 'next/server';
import { followUpActor, followUpError, followUpJson, followUpSameOrigin, followUpService, unauthenticated } from '@/server/services/FollowUpApi';

type Context = { params: Promise<{ visitId: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!followUpSameOrigin(request)) return followUpJson({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const { visitId } = await context.params;
    return followUpJson({ success: true, data: await followUpService.confirm(actor, visitId) });
  } catch (error) { return followUpError(error); }
}
