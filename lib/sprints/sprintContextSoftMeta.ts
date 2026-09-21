import type { SprintContextSoftMeta } from '@/lib/sprints/sprintContextTypes';
import type { AxiosInstance } from 'axios';
import type { NextRequest } from 'next/server';

import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  getIssueTrackerProviderClientForOrganization,
  getIssueTrackerProviderClientFromRequest,
} from '@/lib/issueTrackerProvider/clientFactory';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import { jiraAgileSprintByIdUrl } from '@/lib/issueTrackerProvider/jiraCatalog';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { collectBatchTaskParentKeys } from '@/lib/sprints/taskParentsBatchRouteHelpers';
import { resolveTrackerSprintBoardId } from '@/lib/trackerApi';
import { resolveStoredOrganizationTrackerApiConfig } from '@/lib/trackerRequestConfig';

async function softLoadTrackerClients(input: {
  organizationId: string;
  request: NextRequest | null;
  useStoredTracker: boolean;
}) {
  if (input.useStoredTracker) {
    const issueTracker = await getIssueTrackerProviderClientForOrganization(
      input.organizationId
    );
    const stored = await resolveStoredOrganizationTrackerApiConfig(input.organizationId);
    const trackerApi = createIssueTrackerAxiosForCredentials(stored);
    return { issueTracker, trackerApi };
  }
  if (!input.request) {
    throw new Error('request required when useStoredTracker is false');
  }
  const issueTracker = await getIssueTrackerProviderClientFromRequest(input.request);
  const trackerApi = await getTrackerApiFromRequest(input.request);
  return { issueTracker, trackerApi };
}

function parseOriginBoardId(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const raw = (data as { originBoardId?: unknown }).originBoardId;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

async function softResolveBoardId(
  trackerApi: AxiosInstance,
  sprintId: number
): Promise<number | undefined> {
  const fromTracker = await resolveTrackerSprintBoardId(sprintId, trackerApi);
  if (fromTracker != null) {
    return fromTracker;
  }
  if (!isJiraProviderKind(getIssueTrackerProviderKind())) {
    return undefined;
  }
  const baseUrl = typeof trackerApi.defaults.baseURL === 'string' ? trackerApi.defaults.baseURL : '';
  if (!baseUrl) {
    return undefined;
  }
  try {
    const { data } = await trackerApi.get<unknown>(jiraAgileSprintByIdUrl(baseUrl, sprintId));
    return parseOriginBoardId(data);
  } catch {
    return undefined;
  }
}

export async function softLoadSprintContextMeta(input: {
  organizationId: string;
  request: NextRequest | null;
  sprintId: number;
  useStoredTracker: boolean;
}): Promise<SprintContextSoftMeta> {
  const soft: SprintContextSoftMeta = { warnings: [] };
  try {
    const { issueTracker, trackerApi } = await softLoadTrackerClients(input);
    try {
      const sprint = await issueTracker.getSprint(input.sprintId);
      soft.sprintWindow = {
        endDate: sprint.endDate,
        name: sprint.name,
        startDate: sprint.startDate,
        status: sprint.status,
      };
    } catch (error) {
      console.warn(`[sprint-context] soft getSprint(${input.sprintId}):`, error);
      soft.warnings?.push(
        `tracker_sprint_unavailable: getSprint(${input.sprintId}) failed (wrong id or tracker error)`
      );
    }
    try {
      const boardId = await softResolveBoardId(trackerApi, input.sprintId);
      if (boardId != null) {
        soft.boardId = boardId;
      } else if (soft.sprintWindow) {
        soft.warnings?.push(
          `tracker_board_unavailable: could not resolve boardId for sprint ${input.sprintId}`
        );
      }
    } catch (error) {
      console.warn(`[sprint-context] soft boardId(${input.sprintId}):`, error);
      soft.warnings?.push(`tracker_board_unavailable: boardId lookup failed for sprint ${input.sprintId}`);
    }
  } catch (error) {
    console.warn(`[sprint-context] soft tracker clients(${input.sprintId}):`, error);
    soft.warnings?.push('tracker_clients_unavailable: could not create tracker client from org credentials');
  }
  if (!soft.warnings?.length) {
    delete soft.warnings;
  }
  return soft;
}

export async function softLoadSprintContextTaskParents(input: {
  featureId: string | undefined;
  organizationId: string;
  request: NextRequest | null;
  sprintId: number;
  useStoredTracker: boolean;
}): Promise<Record<string, string> | undefined> {
  if (!input.featureId) {
    return undefined;
  }
  try {
    const { issueTracker } = await softLoadTrackerClients(input);
    return await collectBatchTaskParentKeys(issueTracker, [input.sprintId]);
  } catch (error) {
    console.warn(`[sprint-context] soft task parents(${input.sprintId}):`, error);
    return undefined;
  }
}
