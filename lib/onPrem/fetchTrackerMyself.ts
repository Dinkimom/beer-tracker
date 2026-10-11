import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { createTrackerApiClient } from '@/lib/tracker-client';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

/** GET /myself с переданными креденшалами; 401 при отказе трекера. */
export async function fetchTrackerMyselfOrThrow(input: {
  apiUrl: string;
  jiraEmail?: string;
  oauthToken: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}): Promise<unknown> {
  const trackerApi = createTrackerApiClient(input);
  try {
    const res = await trackerApi.get('/myself');
    return res.data;
  } catch {
    throw new TrackerApiConfigError('Недействительный токен трекера.', 401);
  }
}
