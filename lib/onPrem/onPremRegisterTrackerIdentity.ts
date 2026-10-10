import { jiraCloudOAuthApiBaseUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import { getIssueTrackerProviderKind, getTrackerConfig } from '@/lib/env';
import {
  issueTrackerRequiresExternalOrgId,
  resolveIssueTrackerExternalOrgIdForConnect,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
import { JIRA_EXTERNAL_ORG_ID_FALLBACK } from '@/lib/issueTrackerProvider/types';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

import { fetchTrackerMyselfOrThrow } from './fetchTrackerMyself';
import {
  trackerDisplayNameFromMyself,
  trackerIdentityCandidatesFromMyself,
  trackerWorkEmailFromMyself,
} from './trackerMyselfIdentity';

interface OnPremRegisterTrackerIdentity {
  displayName: string;
  email: string;
  trackerUserId: string | null;
}

export function resolveOnPremRegisterTrackerOrgId(rawTrackerOrgId: string | undefined): string {
  return resolveIssueTrackerExternalOrgIdForConnect(
    getIssueTrackerProviderKind(),
    rawTrackerOrgId ?? ''
  );
}

export function assertOnPremRegisterTrackerOrgId(trackerOrgId: string): void {
  if (issueTrackerRequiresExternalOrgId(getIssueTrackerProviderKind()) && !trackerOrgId) {
    throw new TrackerApiConfigError('Укажите Cloud Organization ID', 400);
  }
}

export function onPremRegisterIdentityFromMyself(
  myself: unknown,
  fallbackEmail?: string
): OnPremRegisterTrackerIdentity {
  const trackerUserId = trackerIdentityCandidatesFromMyself(myself)[0] ?? null;
  const email =
    trackerWorkEmailFromMyself(myself) ??
    (fallbackEmail?.trim().toLowerCase() || null) ??
    (trackerUserId ? `${trackerUserId}@users.atlassian.local` : null);
  if (!email) {
    throw new TrackerApiConfigError(
      'Не удалось определить пользователя трекера (accountId/email). Повторите Connect with Atlassian.',
      422
    );
  }
  return {
    displayName: trackerDisplayNameFromMyself(myself, email),
    email,
    trackerUserId,
  };
}

export async function fetchOnPremRegisterTrackerIdentity(input: {
  cloudId?: string;
  jiraEmail?: string;
  token: string;
  trackerOrgId: string;
}): Promise<OnPremRegisterTrackerIdentity> {
  const kind = getIssueTrackerProviderKind();
  const apiUrl =
    kind === 'jira-cloud' && input.cloudId?.trim()
      ? jiraCloudOAuthApiBaseUrl(input.cloudId.trim())
      : getTrackerConfig().apiUrl;
  const orgId =
    kind === 'jira-cloud'
      ? input.trackerOrgId || JIRA_EXTERNAL_ORG_ID_FALLBACK
      : input.trackerOrgId;
  const myself = await fetchTrackerMyselfOrThrow({
    apiUrl,
    jiraEmail: '',
    oauthToken: input.token,
    orgId,
  });
  return onPremRegisterIdentityFromMyself(myself, input.jiraEmail);
}
