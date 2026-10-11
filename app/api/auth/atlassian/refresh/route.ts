import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAtlassianOAuthConfigured,
  refreshAtlassianAccessToken,
} from '@/lib/atlassianOAuth';
import { refreshOrganizationSharedAtlassianGrant } from '@/lib/organizations/organizationTrackerCredentials';
import { parseRegistryUuidString } from '@/lib/registryUuidString';

const BodySchema = z.object({
  organizationId: z.string().trim().max(64).optional(),
  refreshToken: z.string().trim().min(1).max(8192),
});

/**
 * POST /api/auth/atlassian/refresh
 * Body: { refreshToken, organizationId? } → { accessToken, refreshToken, expiresAt }
 * Если refresh token — грант, сохранённый в организации, пара берётся из БД (единая ротация).
 */
export async function POST(request: Request) {
  const configured = assertAtlassianOAuthConfigured();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.error }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите refreshToken' }, { status: 400 });
  }
  const { refreshToken } = parsed.data;
  const organizationId = parseRegistryUuidString(parsed.data.organizationId);

  try {
    const shared = organizationId
      ? await refreshOrganizationSharedAtlassianGrant(organizationId, refreshToken)
      : null;
    if (shared) {
      return NextResponse.json({
        accessToken: shared.accessToken,
        expiresAt: shared.expiresAt,
        refreshToken: shared.refreshToken,
      });
    }
    const tokens = await refreshAtlassianAccessToken({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      refreshToken,
    });
    return NextResponse.json({
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshToken: tokens.refreshToken,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Не удалось обновить токен Atlassian';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
