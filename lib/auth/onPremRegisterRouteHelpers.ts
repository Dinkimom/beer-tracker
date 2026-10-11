import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { NextResponse } from 'next/server';

import { serializeOrgAtlassianOAuthSecret } from '@/lib/atlassianOAuth/orgSecretPayload';
import { registerOnPremFirstUser } from '@/lib/auth/onPremRegisterRepository';
import {
  JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import {
  assertOnPremRegisterTrackerOrgId,
  fetchOnPremRegisterTrackerIdentity,
  resolveOnPremRegisterTrackerOrgId,
} from '@/lib/onPrem/onPremRegisterTrackerIdentity';
import {
  encryptTrackerTokenOrError,
  resolveIssueTrackerForConnection,
} from '@/lib/organizations/organizationTrackerConnectionHelpers';
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
 * Первичная on-prem регистрация: трекер выбирается в форме и сохраняется в организации.
 * Jira Cloud: Atlassian OAuth access/refresh + cloudId; профиль админа — из GET /myself.
 */
export async function registerOnPremFirstUserFromTrackerToken(input: {
  cloudId?: string;
  expiresAt?: number;
  jiraEmail?: string;
  orgName: string;
  provider: IssueTrackerProviderKind;
  refreshToken?: string;
  token: string;
  trackerApiBaseUrl?: string;
  trackerOrgId?: string;
}): Promise<NextResponse> {
  const token = cleanOrganizationTrackerToken(input.token);
  if (!token) {
    return NextResponse.json({ error: 'Укажите токен трекера' }, { status: 400 });
  }

  const resolved = resolveIssueTrackerForConnection(
    { initial_sync_completed_at: null, settings: {} },
    { provider: input.provider, trackerApiBaseUrl: input.trackerApiBaseUrl }
  );
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const tracker = resolved.config;
  const cloudId = input.cloudId?.trim() ?? '';
  if (tracker.kind === 'jira-cloud' && !cloudId) {
    return NextResponse.json({ error: JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE }, { status: 400 });
  }

  const trackerOrgId = resolveOnPremRegisterTrackerOrgId(tracker.kind, input.trackerOrgId);
  let identity;
  try {
    assertOnPremRegisterTrackerOrgId(tracker.kind, trackerOrgId);
    identity = await fetchOnPremRegisterTrackerIdentity({
      cloudId: cloudId || undefined,
      jiraEmail: input.jiraEmail,
      token,
      tracker,
      trackerOrgId,
    });
  } catch (err) {
    return mapTrackerIdentityError(err);
  }

  const secretToStore =
    tracker.kind === 'jira-cloud' && input.refreshToken?.trim()
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
    tracker,
    trackerOrgId,
    trackerUserId: identity.trackerUserId,
  });
}
