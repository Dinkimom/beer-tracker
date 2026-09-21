import { findUserByEmail } from '@/lib/auth';
import {
  resolveTrackerCloudContextForProductOrganizationIdOnPrem,
  TrackerApiConfigError,
} from '@/lib/trackerRequestConfig';

import { fetchTrackerMyselfOrThrow } from './fetchTrackerMyself';
import { trackerWorkEmailFromMyself } from './trackerMyselfIdentity';

export async function resolveProductUserIdForOnPremTrackerSession(input: {
  jiraEmail?: string;
  oauthToken: string;
  organizationProductId: string;
}): Promise<{ userId: string }> {
  const { apiUrl, orgId } = await resolveTrackerCloudContextForProductOrganizationIdOnPrem(
    input.organizationProductId
  );

  const myself = await fetchTrackerMyselfOrThrow({
    apiUrl,
    jiraEmail: input.jiraEmail,
    oauthToken: input.oauthToken,
    orgId,
  });

  const emailNorm =
    trackerWorkEmailFromMyself(myself) ?? (input.jiraEmail?.trim().toLowerCase() || null);
  if (!emailNorm) {
    throw new TrackerApiConfigError(
      'В профиле трекера не указан email. Укажите email в трекере и повторите вход.',
      422
    );
  }

  const identity = await findUserByEmail(emailNorm);
  if (!identity) {
    throw new TrackerApiConfigError(
      'Сотрудник не найден в реестре сотрудников. Обратитесь к администратору.',
      403
    );
  }

  return { userId: identity.id };
}
