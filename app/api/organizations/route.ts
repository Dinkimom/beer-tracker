import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireProductSession } from '@/lib/auth/requireProductSession';
import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';
import { createOrganizationForUser } from '@/lib/organizations/organizationsCreateHelpers';

const PostBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

/**
 * POST /api/organizations — создать организацию и назначить текущего пользователя org_admin.
 */
export async function POST(request: Request) {
  const auth = requireProductSession(request);
  if (auth.response) {
    return auth.response;
  }

  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = PostBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите название организации' }, { status: 400 });
  }

  const { name, slug: slugInput } = parsed.data;
  return createOrganizationForUser({ name, slugInput, userId: auth.userId });
}
