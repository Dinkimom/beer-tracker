import { NextResponse } from 'next/server';

import { serializeOrgAtlassianOAuthSecret } from '@/lib/atlassianOAuth/orgSecretPayload';
import { registerOnPremFirstUser } from '@/lib/auth/onPremRegisterRepository';
import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import {
  assertOnPremRegisterTrackerOrgId,
  fetchOnPremRegisterTrackerIdentity,
  resolveOnPremRegisterTrackerOrgId,
} from '@/lib/onPrem/onPremRegisterTrackerIdentity';
import { encryptTrackerTokenOrError } from '@/lib/organizations/organizationTrackerConnectionHelpers';
import { cleanOrganizationTrackerToken } from '@/lib/trackerCredentialsValidation';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

function mapTrackerIdentityError(err: unknown): NextResponse {
  if (err instanceof TrackerApiConfigError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[auth/register:onprem:identity]', err);
  return NextResponse.json({ error: 'Не удалось проверить токен трекера' }, { status: 502 });
}

/**
 * Первичная on-prem регистрация.
 * Jira Cloud: Atlassian OAuth access/refresh + cloudId; профиль админа — из GET /myself.
 */
export async function registerOnPremFirstUserFromTrackerToken(input: {
  cloudId?: string;
  expiresAt?: number;
  jiraEmail?: string;
  orgName: string;
  refreshToken?: string;
  token: string;
  trackerOrgId?: string;
}): Promise<NextResponse> {
  const token = cleanOrganizationTrackerToken(input.token);
  if (!token) {
    return NextResponse.json({ error: 'Укажите токен трекера' }, { status: 400 });
  }

  const kind = getIssueTrackerProviderKind();
  const cloudId = input.cloudId?.trim() ?? '';
  if (kind === 'jira-cloud' && !cloudId) {
    return NextResponse.json({ error: JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE }, { status: 400 });
  }

  const trackerOrgId = resolveOnPremRegisterTrackerOrgId(input.trackerOrgId);
  let identity;
  try {
    assertOnPremRegisterTrackerOrgId(trackerOrgId);
    identity = await fetchOnPremRegisterTrackerIdentity({
      cloudId: cloudId || undefined,
      token,
      trackerOrgId,
    });
  } catch (err) {
    return mapTrackerIdentityError(err);
  }

  const secretToStore =
    kind === 'jira-cloud' && input.refreshToken?.trim()
      ? serializeOrgAtlassianOAuthSecret({
          accessToken: token,
          expiresAt: input.expiresAt,
          refreshToken: input.refreshToken.trim(),
        })
      : token;

  const encrypted = encryptTrackerTokenOrError(secretToStore);
  if (!encrypted.ok) {
    return NextResponse.json({ error: encrypted.error }, { status: encrypted.status });
  }

  return registerOnPremFirstUser({
    cloudId: cloudId || undefined,
    displayName: identity.displayName,
    email: identity.email,
    encryptedTrackerToken: encrypted.encrypted,
    orgName: input.orgName,
    trackerOrgId,
    trackerUserId: identity.trackerUserId,
  });
}
