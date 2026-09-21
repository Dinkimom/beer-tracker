import { NextResponse } from 'next/server';
import { z } from 'zod';

import { registerOnPremFirstUserFromTrackerToken } from '@/lib/auth/onPremRegisterRouteHelpers';
import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';

const BodySchema = z.object({
  jiraEmail: z.string().max(320).optional(),
  orgName: z.string().min(1).max(200),
  token: z.string().min(1).max(4096),
  trackerOrgId: z.string().max(200).optional(),
});

/**
 * POST /api/auth/register — первичная on-prem настройка: организация + админ.
 * Email берётся из профиля трекера (GET /myself) по переданному токену.
 */
export async function POST(request: Request) {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Проверьте название организации и токен трекера' },
      { status: 400 }
    );
  }

  const setupState = await readOnPremSetupState();
  if (setupState.initialized) {
    return NextResponse.json(
      {
        error:
          'Самостоятельная регистрация отключена. Попросите администратора добавить вас в команду и войдите по OAuth-токену трекера на странице настройки.',
      },
      { status: 403 }
    );
  }

  const orgName = parsed.data.orgName.trim();
  if (!orgName) {
    return NextResponse.json(
      { error: 'Для первичной настройки укажите название организации' },
      { status: 400 }
    );
  }

  return registerOnPremFirstUserFromTrackerToken({
    jiraEmail: parsed.data.jiraEmail,
    orgName,
    token: parsed.data.token,
    trackerOrgId: parsed.data.trackerOrgId,
  });
}
