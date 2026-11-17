import { NextRequest } from 'next/server';
import { followUpActor, followUpError, followUpJson, followUpService, unauthenticated } from '@/server/services/FollowUpApi';

export async function GET(request: NextRequest) {
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    return followUpJson({ success: true, data: await followUpService.listForDoctor(actor) });
  } catch (error) { return followUpError(error); }
}
