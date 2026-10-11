import type { OrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { jiraCloudOAuthApiBaseUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
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

export function resolveOnPremRegisterTrackerOrgId(
  kind: IssueTrackerProviderKind,
  rawTrackerOrgId: string | undefined
): string {
  return resolveIssueTrackerExternalOrgIdForConnect(kind, rawTrackerOrgId ?? '');
}

export function assertOnPremRegisterTrackerOrgId(
  kind: IssueTrackerProviderKind,
  trackerOrgId: string
): void {
  if (issueTrackerRequiresExternalOrgId(kind) && !trackerOrgId) {
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
      'Не удалось определить пользователя трекера (accountId/email). Повторите «Продолжить с Atlassian».',
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
  tracker: OrganizationIssueTrackerConfig;
  trackerOrgId: string;
}): Promise<OnPremRegisterTrackerIdentity> {
  const { kind } = input.tracker;
  const apiUrl =
    kind === 'jira-cloud' && input.cloudId?.trim()
      ? jiraCloudOAuthApiBaseUrl(input.cloudId.trim())
      : input.tracker.apiUrl;
  const orgId =
    kind === 'jira-cloud'
      ? input.trackerOrgId || JIRA_EXTERNAL_ORG_ID_FALLBACK
      : input.trackerOrgId;
  const myself = await fetchTrackerMyselfOrThrow({
    apiUrl,
    jiraEmail: '',
    oauthToken: input.token,
    orgId,
    providerKind: kind,
  });
  return onPremRegisterIdentityFromMyself(myself, input.jiraEmail);
}
