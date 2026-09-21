import { NextResponse } from 'next/server';

import { registerOnPremFirstUser } from '@/lib/auth/onPremRegisterRepository';
import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  cleanJiraBasicAuthEmail,
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  jiraCloudRequiresBasicAuthEmail,
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
 * Jira Cloud: email для Basic-auth приходит с формы; профиль админа — из GET /myself.
 */
export async function registerOnPremFirstUserFromTrackerToken(input: {
  jiraEmail?: string;
  orgName: string;
  token: string;
  trackerOrgId?: string;
}): Promise<NextResponse> {
  const token = cleanOrganizationTrackerToken(input.token);
  if (!token) {
    return NextResponse.json({ error: 'Укажите токен трекера' }, { status: 400 });
  }

  const jiraEmail = cleanJiraBasicAuthEmail(input.jiraEmail);
  if (
    jiraCloudRequiresBasicAuthEmail(getIssueTrackerProviderKind()) &&
    !jiraEmail
  ) {
    return NextResponse.json({ error: JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE }, { status: 400 });
  }

  const trackerOrgId = resolveOnPremRegisterTrackerOrgId(input.trackerOrgId);
  let identity;
  try {
    assertOnPremRegisterTrackerOrgId(trackerOrgId);
    identity = await fetchOnPremRegisterTrackerIdentity({
      jiraEmail,
      token,
      trackerOrgId,
    });
  } catch (err) {
    return mapTrackerIdentityError(err);
  }

  const encrypted = encryptTrackerTokenOrError(token);
  if (!encrypted.ok) {
    return NextResponse.json({ error: encrypted.error }, { status: encrypted.status });
  }

  return registerOnPremFirstUser({
    displayName: identity.displayName,
    email: identity.email,
    encryptedTrackerToken: encrypted.encrypted,
    jiraBasicAuthEmail: jiraEmail,
    orgName: input.orgName,
    trackerOrgId,
    trackerUserId: identity.trackerUserId,
  });
}
