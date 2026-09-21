import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';
import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '@/lib/cache';
import { listTeams } from '@/lib/staffTeams';
import {
  TRACKER_ADMIN_CATALOG_QUEUES_BOARDS_TTL_SEC,
  trackerAdminCatalogConnectionFingerprint,
} from '@/lib/trackerApi/trackerAdminCatalogCache';
import { resolveTrackerApiBaseUrlForOrganizationRow } from '@/lib/trackerRequestConfig';

interface CachedTrackerCatalogSlice {
  boards: { id: number; name: string }[];
  queues: { key: string; name: string }[];
}

export function trackerCatalogAuthFingerprint(api: AxiosInstance): string {
  const raw = String(
    (api.defaults.headers as { Authorization?: string } | undefined)?.Authorization ?? ''
  );
  return raw.replace(/^(Bearer|OAuth)\s+/i, '');
}

function catalogBoardRef(raw: unknown, fallbackId: number): { id: number; name: string } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { id?: unknown; name?: unknown };
  const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : fallbackId;
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : String(id);
  return { id, name };
}

function mergeBoardIntoList(
  boards: CachedTrackerCatalogSlice['boards'],
  extra: { id: number; name: string } | null
): CachedTrackerCatalogSlice['boards'] {
  if (!extra || boards.some((board) => board.id === extra.id)) {
    return boards;
  }
  return [extra, ...boards];
}

async function fetchCatalogQueuesAndBoards(
  issueTracker: IssueTrackerProviderClient
): Promise<CachedTrackerCatalogSlice> {
  const [queues, boards] = await Promise.all([
    issueTracker.listQueues(),
    issueTracker.listBoards(),
  ]);
  return {
    boards: boards.map((board) => ({ id: board.id, name: board.name })),
    queues: queues.map((queue) => ({ key: queue.key, name: queue.name })),
  };
}

async function withEnsuredBoard(
  issueTracker: IssueTrackerProviderClient,
  slice: CachedTrackerCatalogSlice,
  ensureBoardId: number | undefined,
  qbCacheKey: string
): Promise<CachedTrackerCatalogSlice> {
  if (ensureBoardId == null) {
    return slice;
  }
  if (slice.boards.some((board) => board.id === ensureBoardId)) {
    return slice;
  }
  try {
    const extra = catalogBoardRef(await issueTracker.getBoard(ensureBoardId), ensureBoardId);
    const boards = mergeBoardIntoList(slice.boards, extra);
    if (boards === slice.boards) {
      return slice;
    }
    const next = { ...slice, boards };
    apiCache.set(qbCacheKey, next, TRACKER_ADMIN_CATALOG_QUEUES_BOARDS_TTL_SEC);
    return next;
  } catch {
    return slice;
  }
}

export async function loadTrackerCatalogResponse(
  orgId: string,
  org: Pick<OrganizationRow, 'id' | 'tracker_org_id'>,
  issueTracker: IssueTrackerProviderClient,
  options?: { authFingerprint?: string; ensureBoardId?: number }
) {
  const apiUrl = resolveTrackerApiBaseUrlForOrganizationRow(org as OrganizationRow);
  const cacheFingerprint = `${trackerAdminCatalogConnectionFingerprint(
    options?.authFingerprint ?? '',
    apiUrl,
    org.tracker_org_id!.trim()
  )}:rapidview`;
  const qbCacheKey = cacheKeys.adminTrackerCatalogQueuesBoards(orgId, cacheFingerprint);

  let slice = apiCache.get<CachedTrackerCatalogSlice>(qbCacheKey);
  if (!slice) {
    slice = await fetchCatalogQueuesAndBoards(issueTracker);
    apiCache.set(qbCacheKey, slice, TRACKER_ADMIN_CATALOG_QUEUES_BOARDS_TTL_SEC);
  }
  slice = await withEnsuredBoard(issueTracker, slice, options?.ensureBoardId, qbCacheKey);

  const teams = await listTeams(orgId, { activeOnly: false });
  return {
    boards: slice.boards,
    queues: slice.queues,
    teams: teams.map((t) => ({
      id: t.id,
      title: t.title,
      tracker_board_id: t.tracker_board_id,
      tracker_queue_key: t.tracker_queue_key,
    })),
  };
}
