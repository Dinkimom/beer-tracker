/**
 * GET /api/boards/[boardId] — параметры доски (колонки канбана) с in-memory кэшем.
 * Колонки меняются редко; без кэша каждый заход в канбан бьёт Tracker (board + columns).
 */

import type { BoardParams } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';
import {
  createIssueTrackerProviderClientFromResolvedConfig,
} from '@/lib/issueTrackerProvider/clientFactory';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import { trackerAdminCatalogConnectionFingerprint } from '@/lib/trackerApi/trackerAdminCatalogCache';
import {
  resolveDefaultOnPremOrganizationId,
  resolveStoredOrganizationTrackerApiConfig,
  resolveTrackerApiConfigFromRequest,
} from '@/lib/trackerRequestConfig';

type TrackerRequestConfig = Awaited<ReturnType<typeof resolveTrackerApiConfigFromRequest>>;

/** TTL: колонки доски почти не меняются в течение дня планирования. */
export const BOARD_PARAMS_CACHE_TTL_SEC = 30 * 60;

export function parseBoardIdParam(boardIdRaw: string): number | null {
  const boardId = parseInt(boardIdRaw, 10);
  if (Number.isNaN(boardId) || boardId <= 0) {
    return null;
  }
  return boardId;
}

function boardParamsFingerprint(config: {
  apiUrl: string;
  jiraEmail?: string;
  oauthToken: string;
  orgId: string;
}): string {
  return trackerAdminCatalogConnectionFingerprint(
    config.oauthToken,
    config.apiUrl,
    `${config.orgId}\0${config.jiraEmail ?? ''}`
  );
}

function boardParamsCacheKey(config: TrackerRequestConfig, boardId: number): string {
  return cacheKeys.boardParams(boardParamsFingerprint(config), boardId);
}

function boardParamsHaveColumns(board: unknown): board is BoardParams {
  if (!board || typeof board !== 'object') {
    return false;
  }
  const columns = (board as BoardParams).columns;
  return Array.isArray(columns) && columns.length > 0;
}

function sameTrackerAuth(left: TrackerRequestConfig, right: TrackerRequestConfig): boolean {
  return (
    left.apiUrl === right.apiUrl &&
    left.oauthToken === right.oauthToken &&
    (left.jiraEmail ?? '') === (right.jiraEmail ?? '')
  );
}

async function fetchBoardParamsOrNull(
  config: TrackerRequestConfig,
  boardId: number
): Promise<BoardParams | null> {
  try {
    const issueTracker = createIssueTrackerProviderClientFromResolvedConfig(config);
    const board = await issueTracker.getBoard(boardId);
    return boardParamsHaveColumns(board) ? board : null;
  } catch (error) {
    console.error('[board params] tracker board fetch failed', {
      boardId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function productOrganizationIdFromRequest(request: Request): Promise<string | null> {
  const fromHeader = parseRegistryUuidString(request.headers.get(TENANT_ORG_HEADER));
  if (fromHeader) {
    return fromHeader;
  }
  try {
    return await resolveDefaultOnPremOrganizationId();
  } catch {
    return null;
  }
}

async function fetchStoredOrganizationBoardParams(
  request: Request,
  requestConfig: TrackerRequestConfig,
  boardId: number
): Promise<BoardParams | null> {
  const organizationId = await productOrganizationIdFromRequest(request);
  if (!organizationId) {
    return null;
  }
  try {
    const stored = await resolveStoredOrganizationTrackerApiConfig(organizationId);
    if (sameTrackerAuth(stored, requestConfig)) {
      return null;
    }
    return await fetchBoardParamsOrNull(stored, boardId);
  } catch (error) {
    console.error('[board params] stored organization fallback failed', {
      boardId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function loadBoardParamsForRequest(
  request: Request,
  boardId: number
): Promise<BoardParams> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  const cacheKey = boardParamsCacheKey(config, boardId);
  const cached = apiCache.get<BoardParams>(cacheKey);
  if (boardParamsHaveColumns(cached)) {
    return cached;
  }

  const board =
    (await fetchBoardParamsOrNull(config, boardId)) ??
    (await fetchStoredOrganizationBoardParams(request, config, boardId));
  if (!board) {
    throw new Error(`Board ${boardId} columns are unavailable`);
  }
  apiCache.set(cacheKey, board, BOARD_PARAMS_CACHE_TTL_SEC);
  return board;
}
