import type { IssueTrackerProviderKind } from './types';
import type { AxiosInstance } from 'axios';

import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createJiraAxiosInstance } from './jiraAxios';
import { isJiraProviderKind } from './types';

/** Axios к API трекера с заголовком выбранного провайдера (OAuth vs Bearer/Basic). */
export function createIssueTrackerAxiosForCredentials(config: {
  apiUrl: string;
  jiraEmail?: string;
  oauthToken: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}): AxiosInstance {
  if (isJiraProviderKind(config.providerKind)) {
    return createJiraAxiosInstance({
      apiToken: config.oauthToken,
      apiUrl: config.apiUrl,
      email: config.jiraEmail,
    });
  }
  return createTrackerAxiosInstance({
    apiUrl: config.apiUrl,
    oauthToken: config.oauthToken,
    orgId: config.orgId,
  });
}
