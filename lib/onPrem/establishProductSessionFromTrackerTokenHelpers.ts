import { jiraCloudOAuthApiBaseUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import { findUserByEmail } from '@/lib/auth';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { findStaffByOrganizationAndTrackerUserId } from '@/lib/staffTeams';
import {
  resolveTrackerCloudContextForProductOrganizationIdOnPrem,
  TrackerApiConfigError,
} from '@/lib/trackerRequestConfig';

import { fetchTrackerMyselfOrThrow } from './fetchTrackerMyself';
import { onPremRegisterIdentityFromMyself } from './onPremRegisterTrackerIdentity';

function resolveSessionApiUrl(input: {
  cloudId?: string;
  fallbackApiUrl: string;
}): string {
  if (getIssueTrackerProviderKind() !== 'jira-cloud') {
    return input.fallbackApiUrl;
  }
  const cloudId = input.cloudId?.trim() ?? '';
  if (!cloudId) {
    throw new TrackerApiConfigError(
      'Укажите Atlassian cloudId (повторно выполните «Продолжить с Atlassian»).',
      400
    );
  }
  return jiraCloudOAuthApiBaseUrl(cloudId);
}

async function resolveStaffUserIdForTrackerSession(input: {
  email: string;
  organizationProductId: string;
  trackerUserId: string | null;
}): Promise<string> {
  const trackerUserId = input.trackerUserId?.trim() ?? '';
  if (trackerUserId) {
    const byTracker = await findStaffByOrganizationAndTrackerUserId(
      input.organizationProductId,
      trackerUserId
    );
    if (byTracker) {
      return byTracker.id;
    }
  }

  const byEmail = await findUserByEmail(input.email);
  if (byEmail) {
    return byEmail.id;
  }

  throw new TrackerApiConfigError(
    'Сотрудник не найден в реестре сотрудников. Обратитесь к администратору.',
    403
  );
}

export async function resolveProductUserIdForOnPremTrackerSession(input: {
  cloudId?: string;
  jiraEmail?: string;
  oauthToken: string;
  organizationProductId: string;
}): Promise<{ userId: string }> {
  const ctx = await resolveTrackerCloudContextForProductOrganizationIdOnPrem(
    input.organizationProductId
  );
  const cloudId = input.cloudId?.trim() || ctx.cloudId;
  const apiUrl = resolveSessionApiUrl({
    cloudId,
    fallbackApiUrl: ctx.apiUrl,
  });

  const myself = await fetchTrackerMyselfOrThrow({
    apiUrl,
    jiraEmail: '',
    oauthToken: input.oauthToken,
    orgId: ctx.orgId,
  });

  const identity = onPremRegisterIdentityFromMyself(myself, input.jiraEmail);
  const userId = await resolveStaffUserIdForTrackerSession({
    email: identity.email,
    organizationProductId: input.organizationProductId,
    trackerUserId: identity.trackerUserId,
  });

  return { userId };
}
