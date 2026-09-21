import { getIssueTrackerProviderKind, getTrackerConfig } from '@/lib/env';
import {
  issueTrackerRequiresExternalOrgId,
  resolveIssueTrackerExternalOrgIdForConnect,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
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
  const email =
    trackerWorkEmailFromMyself(myself) ??
    (fallbackEmail?.trim().toLowerCase() || null);
  if (!email) {
    throw new TrackerApiConfigError(
      'В профиле трекера не указан email. Укажите email в трекере и повторите настройку.',
      422
    );
  }
  return {
    displayName: trackerDisplayNameFromMyself(myself, email),
    email,
    trackerUserId: trackerIdentityCandidatesFromMyself(myself)[0] ?? null,
  };
}

export async function fetchOnPremRegisterTrackerIdentity(input: {
  jiraEmail?: string;
  token: string;
  trackerOrgId: string;
}): Promise<OnPremRegisterTrackerIdentity> {
  const myself = await fetchTrackerMyselfOrThrow({
    apiUrl: getTrackerConfig().apiUrl,
    jiraEmail: input.jiraEmail,
    oauthToken: input.token,
    orgId: input.trackerOrgId,
  });
  return onPremRegisterIdentityFromMyself(myself, input.jiraEmail);
}
