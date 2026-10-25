import type { SprintTaskCompletionRules } from './sprintTaskCompletion';
import type {
  IssueTrackerProviderClient,
  IssueTrackerStatusCatalogItem,
} from '@/lib/issueTrackerProvider/types';

import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { readOrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import { DEFAULT_ISSUE_TRACKER_PROVIDER_KIND } from '@/lib/issueTrackerProvider/types';

import { sprintTaskCompletionRulesFromStatuses } from './sprintTaskCompletion';

const STATUS_CATALOG_TTL_SEC = 10 * 60;

/** Правила «сделано» для организации: справочник статусов трекера с кэшем на 10 минут. */
export async function loadSprintTaskCompletionRules(
  organizationId: string,
  issueTracker: Pick<IssueTrackerProviderClient, 'listStatuses' | 'providerKind'>
): Promise<SprintTaskCompletionRules> {
  const cacheKey = cacheKeys.trackerStatusCatalog(organizationId);
  let statuses = apiCache.get<IssueTrackerStatusCatalogItem[]>(cacheKey);
  if (!statuses) {
    statuses = await issueTracker.listStatuses();
    if (statuses.length > 0) {
      apiCache.set(cacheKey, statuses, STATUS_CATALOG_TTL_SEC);
    }
  }
  return sprintTaskCompletionRulesFromStatuses(issueTracker.providerKind, statuses);
}

/**
 * Правила для DTO планера. Без доступа к трекеру (нет токена, сбой) — пустой справочник:
 * текущие задачи несут свой тип статуса, без справочника страдает только история.
 */
export async function loadSprintTaskCompletionRulesForRequest(
  request: Request,
  organization: { id: string; settings: unknown }
): Promise<SprintTaskCompletionRules> {
  try {
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    return await loadSprintTaskCompletionRules(organization.id, issueTracker);
  } catch {
    const kind =
      readOrganizationIssueTrackerConfig(organization.settings)?.kind ??
      DEFAULT_ISSUE_TRACKER_PROVIDER_KIND;
    return sprintTaskCompletionRulesFromStatuses(kind, []);
  }
}
