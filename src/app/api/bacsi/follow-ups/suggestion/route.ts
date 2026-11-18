import { NextRequest } from 'next/server';
import { followUpActor, followUpError, followUpJson, followUpService, unauthenticated } from '@/server/services/FollowUpApi';

export async function GET(request: NextRequest) {
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const visitId = request.nextUrl.searchParams.get('visitId') ?? '';
    return followUpJson({ success: true, data: await followUpService.getSuggestion(actor, visitId) });
  } catch (error) { return followUpError(error); }
}
