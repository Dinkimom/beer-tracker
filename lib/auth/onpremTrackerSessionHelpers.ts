import { NextResponse } from 'next/server';
import { z } from 'zod';

import { appendProductSessionCookie } from '@/lib/auth';
import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';
import { resolveProductUserIdForOnPremTrackerSession } from '@/lib/onPrem/establishProductSessionFromTrackerToken';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

const BodySchema = z.object({
  jiraEmail: z.string().max(320).optional(),
  organizationId: z.string().uuid(),
  token: z.string().min(1).max(8192),
});

function cleanToken(token: string): string {
  return token.replace(/\s+/g, '').trim();
}

async function issueOnPremTrackerSession(
  organizationId: string,
  oauthToken: string,
  jiraEmail?: string
): Promise<NextResponse> {
  try {
    const { userId } = await resolveProductUserIdForOnPremTrackerSession({
      jiraEmail,
      oauthToken,
      organizationProductId: organizationId,
    });
    const res = NextResponse.json({ ok: true });
    appendProductSessionCookie(res, userId);
    return res;
  } catch (e) {
    if (e instanceof TrackerApiConfigError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[auth/onprem/tracker-session]', e);
    return NextResponse.json({ error: 'Не удалось выдать сессию' }, { status: 500 });
  }
}

export async function establishOnPremTrackerSession(request: Request): Promise<NextResponse> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите organizationId и token' }, { status: 400 });
  }

  const oauthToken = cleanToken(parsed.data.token);
  if (!oauthToken) {
    return NextResponse.json({ error: 'Токен пустой' }, { status: 400 });
  }

  return issueOnPremTrackerSession(
    parsed.data.organizationId,
    oauthToken,
    parsed.data.jiraEmail
  );
}
