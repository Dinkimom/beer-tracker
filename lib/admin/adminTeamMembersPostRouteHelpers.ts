import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  addTeamMemberFromPostBody,
  parseTeamRouteIds,
  requireTeamManagementForRoute,
} from '@/lib/admin/adminTeamMembersPostHelpers';
import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';
import { REGISTRY_UUID_STRING_RE } from '@/lib/registryUuidString';

const optionalUuidParam = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.string().uuid({ error: () => ({ message: 'Некорректный user_id' }) }).optional()
);

const optionalRegistryStaffUidParam = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z
    .string()
    .regex(REGISTRY_UUID_STRING_RE, { message: 'Некорректный staff_uid' })
    .optional()
);

const TeamMemberPostBodySchema = z
  .object({
    display_name: z.string().trim().min(1).max(512).optional(),
    email: z.string().trim().email().max(320).optional(),
    role_slug: z.string().trim().min(1).max(128).optional().nullable(),
    staff_uid: optionalRegistryStaffUidParam,
    tracker_user_id: z.string().min(1).max(256).optional(),
    user_id: optionalUuidParam,
  })
  .superRefine((data, ctx) => {
    const byUser = Boolean(data.user_id);
    const byTracker = Boolean(data.tracker_user_id);
    const byRegistry = Boolean(data.staff_uid);
    const methods = Number(byUser) + Number(byTracker) + Number(byRegistry);
    if (methods !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите ровно один способ: user_id, staff_uid или tracker_user_id (+ email)',
      });
    }
    if (byTracker && !data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Для добавления из трекера укажите email',
        path: ['email'],
      });
    }
  });

async function parseTeamMemberPostBody(request: Request): Promise<NextResponse | z.infer<typeof TeamMemberPostBodySchema>> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = TeamMemberPostBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Некорректное тело запроса';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return parsed.data;
}

export async function postTeamMemberRoute(
  request: Request,
  organizationId: string,
  teamIdRaw: string
) {
  const ids = parseTeamRouteIds(teamIdRaw);
  if (ids instanceof NextResponse) {
    return ids;
  }
  const auth = await requireTeamManagementForRoute(request, organizationId, ids.teamId);
  if (auth instanceof NextResponse) {
    return auth;
  }
  const body = await parseTeamMemberPostBody(request);
  if (body instanceof NextResponse) {
    return body;
  }
  return addTeamMemberFromPostBody(auth, ids.teamId, body);
}
