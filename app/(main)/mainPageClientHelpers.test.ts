import { describe, expect, it } from 'vitest';

import {
  getPlannerPathStorageSync,
  getPlannerPathSyncRedirectTarget,
  isPlannerDeepLinkStorageSyncPending,
  plannerPathSelectionKey,
  resolvePlannerQueryBoardId,
  shouldKeepPlannerPathSprint,
  shouldRedirectToSelectBoard,
} from './mainPageClientHelpers';

const BOOKING_BOARD = 14684;
const STALE_YANDEX_BOARD = 31;

function getBoardById(id: number) {
  return id === BOOKING_BOARD ? { id } : null;
}

const redirectBase = {
  getBoardById,
  isMounted: true,
  isPlannerDeepLink: false,
  selectedBoardId: null as number | null,
};

describe('resolvePlannerQueryBoardId', () => {
  it('waits until the boards list has loaded', () => {
    expect(
      resolvePlannerQueryBoardId({
        boardsLoading: true,
        getBoardById,
        selectedBoardId: BOOKING_BOARD,
      })
    ).toBeNull();
  });

  it('returns the stored board only when it is in the org team list', () => {
    expect(
      resolvePlannerQueryBoardId({
        boardsLoading: false,
        getBoardById,
        selectedBoardId: BOOKING_BOARD,
      })
    ).toBe(BOOKING_BOARD);
  });

  it('ignores a leftover board id that is not in GET /api/boards', () => {
    expect(
      resolvePlannerQueryBoardId({
        boardsLoading: false,
        getBoardById,
        selectedBoardId: STALE_YANDEX_BOARD,
      })
    ).toBeNull();
  });
});

describe('shouldRedirectToSelectBoard', () => {
  it('does not redirect before mount', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: false,
        isMounted: false,
        selectedBoardId: STALE_YANDEX_BOARD,
      })
    ).toBe(false);
  });

  it('sends a user without a stored board to the picker', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: false,
        selectedBoardId: null,
      })
    ).toBe(true);
  });

  it('waits for the boards list before treating a stored id as stale', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: true,
        selectedBoardId: STALE_YANDEX_BOARD,
      })
    ).toBe(false);
  });

  it('sends a leftover board id that is not in the team list to the picker', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: false,
        selectedBoardId: STALE_YANDEX_BOARD,
      })
    ).toBe(true);
  });

  it('keeps a stored board that belongs to the org', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: false,
        selectedBoardId: BOOKING_BOARD,
      })
    ).toBe(false);
  });

  it('does not bounce a deep link to a known board while the list is loading', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: true,
        isPlannerDeepLink: true,
        plannerBoardId: BOOKING_BOARD,
        selectedBoardId: null,
      })
    ).toBe(false);
  });

  it('does not bounce a deep link once the board is in the list', () => {
    expect(
      shouldRedirectToSelectBoard({
        ...redirectBase,
        boardsLoading: false,
        isPlannerDeepLink: true,
        plannerBoardId: BOOKING_BOARD,
        selectedBoardId: BOOKING_BOARD,
      })
    ).toBe(false);
  });
});

describe('plannerPathSelectionKey', () => {
  it('reads board and sprint from a planner path', () => {
    expect(plannerPathSelectionKey('/planner/12/sprint/34')).toBe('12-34');
  });

  it('returns null outside the planner', () => {
    expect(plannerPathSelectionKey('/')).toBeNull();
    expect(plannerPathSelectionKey('/select-board')).toBeNull();
  });
});

describe('isPlannerDeepLinkStorageSyncPending', () => {
  it('blocks path-sync until the planner URL is written to storage', () => {
    expect(
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: null,
        pathname: '/planner/12/sprint/34',
        plannerDeepLinkKey: '12-34',
      })
    ).toBe(true);
  });

  it('blocks path-sync when the URL already changed but props still have the previous sprint', () => {
    expect(
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: '12-34',
        pathname: '/planner/12/sprint/34',
        plannerDeepLinkKey: '12-56',
      })
    ).toBe(true);
  });

  it('blocks path-sync when lastSynced still points at the previous sprint', () => {
    expect(
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: '12-56',
        pathname: '/planner/12/sprint/34',
        plannerDeepLinkKey: '12-56',
      })
    ).toBe(true);
  });

  it('allows path-sync after URL, storage key and page props agree', () => {
    expect(
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: '12-34',
        pathname: '/planner/12/sprint/34',
        plannerDeepLinkKey: '12-34',
      })
    ).toBe(false);
  });

  it('does not treat the root path as a pending deep link', () => {
    expect(
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: null,
        pathname: '/',
        plannerDeepLinkKey: null,
      })
    ).toBe(false);
  });
});

describe('getPlannerPathStorageSync', () => {
  it('writes the URL sprint into storage on the first planner path', () => {
    expect(
      getPlannerPathStorageSync({
        lastSyncedPlannerKey: null,
        pathname: '/planner/12/sprint/34',
      })
    ).toEqual({ boardId: 12, key: '12-34', sprintId: 34 });
  });

  it('follows a notification navigation to another sprint before page props update', () => {
    expect(
      getPlannerPathStorageSync({
        lastSyncedPlannerKey: '12-56',
        pathname: '/planner/12/sprint/34',
      })
    ).toEqual({ boardId: 12, key: '12-34', sprintId: 34 });
  });

  it('is a no-op when storage already matches the URL', () => {
    expect(
      getPlannerPathStorageSync({
        lastSyncedPlannerKey: '12-34',
        pathname: '/planner/12/sprint/34',
      })
    ).toBeNull();
  });
});

describe('getPlannerPathSyncRedirectTarget', () => {
  const pathSyncBase = {
    boardsLoading: false,
    isMounted: true,
    pathname: '/planner/12/sprint/34',
    searchParamsKey: 'focusTask=DEV-1',
    selectedBoardId: 12,
    selectedSprintId: 56,
    sprints: [{ id: 34 }, { id: 56 }],
  };

  it('does not revert a notification URL while deep-link sync is pending', () => {
    expect(
      getPlannerPathSyncRedirectTarget({
        ...pathSyncBase,
        isPlannerDeepLinkSyncPending: () => true,
      })
    ).toBeNull();
  });

  it('does not revert a link to an in-progress sprint when storage still has another sprint', () => {
    expect(
      getPlannerPathSyncRedirectTarget({
        ...pathSyncBase,
        isPlannerDeepLinkSyncPending: () => false,
      })
    ).toBeNull();
  });

  it('does not rewrite the path until the sprints list has loaded', () => {
    expect(
      getPlannerPathSyncRedirectTarget({
        ...pathSyncBase,
        isPlannerDeepLinkSyncPending: () => false,
        sprints: [],
      })
    ).toBeNull();
  });

  it('rewrites a stale URL sprint that is missing from the board list', () => {
    expect(
      getPlannerPathSyncRedirectTarget({
        ...pathSyncBase,
        isPlannerDeepLinkSyncPending: () => false,
        sprints: [{ id: 56 }],
      })
    ).toBe('/planner/12/sprint/56?focusTask=DEV-1');
  });

  it('keeps the current URL when storage already matches the path', () => {
    expect(
      getPlannerPathSyncRedirectTarget({
        ...pathSyncBase,
        isPlannerDeepLinkSyncPending: () => false,
        selectedSprintId: 34,
      })
    ).toBeNull();
  });
});

describe('shouldKeepPlannerPathSprint', () => {
  it('keeps the URL sprint when it is still on the board', () => {
    expect(
      shouldKeepPlannerPathSprint({
        pathname: '/planner/12/sprint/34',
        sprints: [{ id: 34 }, { id: 56 }],
      })
    ).toBe(true);
  });

  it('allows a rewrite when the URL sprint is gone from the list', () => {
    expect(
      shouldKeepPlannerPathSprint({
        pathname: '/planner/12/sprint/34',
        sprints: [{ id: 56 }],
      })
    ).toBe(false);
  });
});
