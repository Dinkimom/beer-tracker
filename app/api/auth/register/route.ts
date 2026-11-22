import { NextResponse } from 'next/server';
import { z } from 'zod';

import { registerOnPremFirstUserFromTrackerToken } from '@/lib/auth/onPremRegisterRouteHelpers';
import { parseJsonRequestBodyWithSchema } from '@/lib/http/parseJsonRequestBody';
import { ISSUE_TRACKER_PROVIDER_KINDS } from '@/lib/issueTrackerProvider/types';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';

const BodySchema = z.object({
  cloudId: z.string().max(128).optional(),
  expiresAt: z.number().finite().optional(),
  jiraEmail: z.string().max(320).optional(),
  orgName: z.string().min(1).max(200),
  provider: z.enum(ISSUE_TRACKER_PROVIDER_KINDS),
  refreshToken: z.string().max(8192).optional(),
  token: z.string().min(1).max(8192),
  trackerApiBaseUrl: z.string().max(2048).optional(),
  trackerOrgId: z.string().max(200).optional(),
});

/**
 * POST /api/auth/register — первичная on-prem настройка: организация + админ.
 * Email берётся из профиля трекера (GET /myself) по переданному токену.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonRequestBodyWithSchema(
    request,
    BodySchema,
    'Проверьте название организации и токен трекера'
  );
  if (parsed instanceof NextResponse) {
    return parsed;
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

  const orgName = parsed.orgName.trim();
  if (!orgName) {
    return NextResponse.json(
      { error: 'Для первичной настройки укажите название организации' },
      { status: 400 }
    );
  }

  return registerOnPremFirstUserFromTrackerToken({
    cloudId: parsed.cloudId,
    expiresAt: parsed.expiresAt,
    jiraEmail: parsed.jiraEmail,
    orgName,
    provider: parsed.provider,
    refreshToken: parsed.refreshToken,
    token: parsed.token,
    trackerApiBaseUrl: parsed.trackerApiBaseUrl,
    trackerOrgId: parsed.trackerOrgId,
  });
}
