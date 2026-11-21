import type {
  IssueTrackerProviderClient,
  IssueTrackerProviderKind,
  JiraIssueTrackerProvider,
  YandexIssueTrackerProvider,
} from './types';

import {
  resolveStoredOrganizationTrackerApiConfig,
  resolveTrackerApiConfigFromRequest,
} from '@/lib/trackerRequestConfig';

import { resolveIssueTrackerProvider } from './registry';
import { isJiraProviderKind } from './types';

interface ResolvedTrackerApiConfig {
  apiUrl: string;
  jiraEmail?: string;
  oauthToken: string;
  organizationId: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
  webBaseUrl: string;
}

export function createIssueTrackerProviderClientFromResolvedConfig(
  config: ResolvedTrackerApiConfig
): IssueTrackerProviderClient {
  const provider = resolveIssueTrackerProvider(config.providerKind);
  if (isJiraProviderKind(config.providerKind)) {
    return (provider as JiraIssueTrackerProvider).createProviderClient({
      apiToken: config.oauthToken,
      apiUrl: config.apiUrl,
      email: config.jiraEmail,
      kind: config.providerKind,
      organizationId: config.organizationId,
      webBaseUrl: config.webBaseUrl,
    });
  }
  return (provider as YandexIssueTrackerProvider).createProviderClient({
    apiUrl: config.apiUrl,
    oauthToken: config.oauthToken,
    organizationId: config.organizationId,
    orgId: config.orgId,
  });
}

export async function getIssueTrackerProviderClientFromRequest(
  request: Request
): Promise<IssueTrackerProviderClient> {
  return createIssueTrackerProviderClientFromResolvedConfig(
    await resolveTrackerApiConfigFromRequest(request)
  );
}

/** Клиент по сохранённому токену организации (админка, без X-Tracker-Token). */
export async function getIssueTrackerProviderClientForOrganization(
  organizationProductId: string
): Promise<IssueTrackerProviderClient> {
  return createIssueTrackerProviderClientFromResolvedConfig(
    await resolveStoredOrganizationTrackerApiConfig(organizationProductId)
  );
}
