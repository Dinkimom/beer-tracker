import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';
import { trackerAdminCatalogConnectionFingerprint } from '@/lib/trackerApi/trackerAdminCatalogCache';

import {
  BOARD_PARAMS_CACHE_TTL_SEC,
  loadBoardParamsForRequest,
  parseBoardIdParam,
} from './boardParamsRouteHelpers';

vi.mock('@/lib/trackerRequestConfig', () => ({
  resolveTrackerApiConfigFromRequest: vi.fn(),
}));

vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({
  createIssueTrackerProviderClientFromResolvedConfig: vi.fn(),
}));

import { createIssueTrackerProviderClientFromResolvedConfig } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

const boardFixture = {
  columns: [{ display: 'Todo', id: '1', statusKeys: ['open'] }],
  id: 42,
  name: 'Board',
  self: 'https://example/board/42',
};

const trackerConfig = {
  apiUrl: 'https://api.tracker.example',
  jiraEmail: '',
  oauthToken: 'token-xyz',
  orgId: 'org-1',
  providerKind: 'tracker' as const,
};

function cacheKeyForConfig(): string {
  const fingerprint = trackerAdminCatalogConnectionFingerprint(
    trackerConfig.oauthToken,
    trackerConfig.apiUrl,
    `${trackerConfig.orgId}\0${trackerConfig.jiraEmail}`
  );
  return cacheKeys.boardParams(fingerprint, 42);
}

describe('parseBoardIdParam', () => {
  it('accepts positive integers', () => {
    expect(parseBoardIdParam('12')).toBe(12);
  });

  it('rejects invalid ids', () => {
    expect(parseBoardIdParam('0')).toBeNull();
    expect(parseBoardIdParam('-1')).toBeNull();
    expect(parseBoardIdParam('abc')).toBeNull();
  });
});

describe('loadBoardParamsForRequest', () => {
  beforeEach(() => {
    apiCache.delete(cacheKeyForConfig());
    vi.mocked(resolveTrackerApiConfigFromRequest).mockResolvedValue(trackerConfig);
  });

  afterEach(() => {
    apiCache.delete(cacheKeyForConfig());
    vi.restoreAllMocks();
  });

  it('fetches from Tracker and caches the result', async () => {
    const getBoard = vi.fn().mockResolvedValue(boardFixture);
    vi.mocked(createIssueTrackerProviderClientFromResolvedConfig).mockReturnValue({
      getBoard,
    } as never);

    const request = new Request('http://localhost/api/boards/42');
    const first = await loadBoardParamsForRequest(request, 42);
    const second = await loadBoardParamsForRequest(request, 42);

    expect(first).toEqual(boardFixture);
    expect(second).toEqual(boardFixture);
    expect(getBoard).toHaveBeenCalledTimes(1);
    expect(apiCache.get(cacheKeyForConfig())).toEqual(boardFixture);
    expect(BOARD_PARAMS_CACHE_TTL_SEC).toBe(30 * 60);
  });

  it('returns cached board without calling Tracker', async () => {
    apiCache.set(cacheKeyForConfig(), boardFixture, BOARD_PARAMS_CACHE_TTL_SEC);
    const getBoard = vi.fn();
    vi.mocked(createIssueTrackerProviderClientFromResolvedConfig).mockReturnValue({
      getBoard,
    } as never);

    const result = await loadBoardParamsForRequest(
      new Request('http://localhost/api/boards/42'),
      42
    );

    expect(result).toEqual(boardFixture);
    expect(getBoard).not.toHaveBeenCalled();
    expect(createIssueTrackerProviderClientFromResolvedConfig).not.toHaveBeenCalled();
  });
});
