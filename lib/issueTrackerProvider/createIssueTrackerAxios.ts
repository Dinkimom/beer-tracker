import type { IssueTrackerProviderKind } from './types';
import type { AxiosInstance } from 'axios';

import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createJiraAxiosInstance } from './jiraAxios';
import { createOtorvaRawAxios, OTORVA_DEFAULT_API_URL } from './otorvaApi';
import { isJiraProviderKind } from './types';

/** Axios к API трекера с заголовком выбранного провайдера (OAuth vs Bearer/Basic). */
export function createIssueTrackerAxiosForCredentials(config: {
  apiUrl: string;
  jiraEmail?: string;
  oauthToken: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}): AxiosInstance {
  if (config.providerKind === 'otorva') {
    return createOtorvaRawAxios(config.apiUrl.trim() || OTORVA_DEFAULT_API_URL, config.oauthToken);
  }
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
