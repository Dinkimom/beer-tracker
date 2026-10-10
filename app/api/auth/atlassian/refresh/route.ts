import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAtlassianOAuthConfigured,
  refreshAtlassianAccessToken,
} from '@/lib/atlassianOAuth';
import { getIssueTrackerProviderKind } from '@/lib/env';

const BodySchema = z.object({
  refreshToken: z.string().trim().min(1).max(8192),
});

/**
 * POST /api/auth/atlassian/refresh
 * Body: { refreshToken } → { accessToken, refreshToken, expiresAt }
 */
export async function POST(request: Request) {
  if (getIssueTrackerProviderKind() !== 'jira-cloud') {
    return NextResponse.json(
      { error: 'Atlassian OAuth доступен только при ISSUE_TRACKER_PROVIDER=jira-cloud' },
      { status: 400 }
    );
  }

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

  try {
    const tokens = await refreshAtlassianAccessToken({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      refreshToken: parsed.data.refreshToken,
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