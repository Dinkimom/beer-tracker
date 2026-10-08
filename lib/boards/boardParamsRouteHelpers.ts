/**
 * GET /api/boards/[boardId] — параметры доски (колонки канбана) с in-memory кэшем.
 * Колонки меняются редко; без кэша каждый заход в канбан бьёт Tracker (board + columns).
 */

import type { BoardParams } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';
import {
  createIssueTrackerProviderClientFromResolvedConfig,
} from '@/lib/issueTrackerProvider/clientFactory';
import { trackerAdminCatalogConnectionFingerprint } from '@/lib/trackerApi/trackerAdminCatalogCache';
import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

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

export async function loadBoardParamsForRequest(
  request: Request,
  boardId: number
): Promise<BoardParams> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  const fingerprint = boardParamsFingerprint(config);
  const cacheKey = cacheKeys.boardParams(fingerprint, boardId);

  const cached = apiCache.get<BoardParams>(cacheKey);
  if (cached) {
    return cached;
  }

  const issueTracker = createIssueTrackerProviderClientFromResolvedConfig(config);
  const board = (await issueTracker.getBoard(boardId)) as BoardParams;
  apiCache.set(cacheKey, board, BOARD_PARAMS_CACHE_TTL_SEC);
  return board;
}
