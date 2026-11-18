import { NextRequest } from 'next/server';
import { AftercareTemplateCreateSchema } from '@/features/follow-ups/follow-ups.schema';
import { followUpActor, followUpError, followUpJson, followUpSameOrigin, followUpService, unauthenticated } from '@/server/services/FollowUpApi';

export async function GET(request: NextRequest) {
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const appliesTo = request.nextUrl.searchParams.get('appliesTo')?.slice(0, 120) || undefined;
    const scopeValue = request.nextUrl.searchParams.get('scope');
    const scope = scopeValue === 'PERSONAL' || scopeValue === 'DEPARTMENT' || scopeValue === 'CLINIC' ? scopeValue : undefined;
    if (scopeValue && !scope) return followUpJson({ success: false, code: 'VALIDATION_FAILED', error: 'Phạm vi mẫu không hợp lệ.' }, 400);
    return followUpJson({ success: true, data: await followUpService.listTemplates(actor, { appliesTo, scope }) });
  } catch (error) { return followUpError(error); }
}

export async function POST(request: NextRequest) {
  if (!followUpSameOrigin(request)) return followUpJson({ success: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  try {
    const actor = await followUpActor(request);
    if (!actor) return unauthenticated();
    const input = AftercareTemplateCreateSchema.parse(await request.json());
    return followUpJson({ success: true, data: await followUpService.createTemplate(actor, input) }, 201);
  } catch (error) { return followUpError(error); }
}
