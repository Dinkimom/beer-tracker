import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import {
  canonicalPlannerUrl,
  getCanonicalPlannerRedirectTarget,
  getPlannerPathStorageSync,
  getPlannerPathSyncRedirectTarget,
  isPlannerDeepLinkStorageSyncPending,
  resolveSprintListValidationAction,
  shouldRedirectToSelectBoard,
} from './mainPageClientHelpers';

export function useMainPageClientRedirects({
  boardsLoading,
  getBoardById,
  isMounted,
  isPlannerDeepLink,
  pathname,
  plannerBoardId,
  plannerDeepLinkKey,
  router,
  searchParamsKey,
  selectedBoardId,
  selectedSprintId,
  setSelectedBoardId,
  setSelectedSprintIdState,
  sprints,
  updateSprintIdWithValidation,
}: {
  boardsLoading: boolean;
  getBoardById: (id: number) => unknown;
  isMounted: boolean;
  isPlannerDeepLink: boolean;
  pathname: string;
  plannerBoardId?: number;
  plannerDeepLinkKey: string | null;
  router: { push: (url: string) => void; replace: (url: string, opts?: { scroll: boolean }) => void };
  searchParamsKey: string;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  setSelectedBoardId: (id: number | null) => void;
  setSelectedSprintIdState: (value: number | ((current: number | null) => number | null) | null) => void;
  sprints: Array<{ id: number; status?: string; archived?: boolean }>;
  updateSprintIdWithValidation: (sprints: Array<{ id: number; status?: string; archived?: boolean }>) => void;
}) {
  const lastSyncedPlannerKeyRef = useRef<string | null>(null);
  const isPlannerDeepLinkSyncPending = useCallback(
    () =>
      isPlannerDeepLinkStorageSyncPending({
        lastSyncedPlannerKey: lastSyncedPlannerKeyRef.current,
        pathname,
        plannerDeepLinkKey,
      }),
    [pathname, plannerDeepLinkKey]
  );

  /**
   * URL (pathname) → storage сразу. Не берём board/sprint из props страницы: при
   * `router.push` из уведомлений `usePathname` обновляется раньше `use(params)`,
   * и запись «старых» props откатывает переход. Path-sync (storage → URL)
   * блокируется, пока ключ pathname не записан и пока props не догнали URL.
   */
  useLayoutEffect(() => {
    if (!isMounted) return;
    const next = getPlannerPathStorageSync({
      lastSyncedPlannerKey: lastSyncedPlannerKeyRef.current,
      pathname,
    });
    if (!next) return;
    lastSyncedPlannerKeyRef.current = next.key;
    setSelectedBoardId(next.boardId);
    setSelectedSprintIdState(next.sprintId);
  }, [isMounted, pathname, setSelectedBoardId, setSelectedSprintIdState]);

  useLayoutEffect(() => {
    if (!isMounted || !isPlannerDeepLink || boardsLoading) return;
    if (plannerBoardId == null || getBoardById(plannerBoardId)) return;
    router.replace('/select-board');
  }, [isMounted, isPlannerDeepLink, boardsLoading, plannerBoardId, getBoardById, router]);

  useEffect(() => {
    const next = getCanonicalPlannerRedirectTarget({
      boardsLoading,
      getBoardById,
      isMounted,
      isPlannerDeepLinkSyncPending,
      pathname,
      searchParamsKey,
      selectedBoardId,
      selectedSprintId,
    });
    if (!next) return;
    router.replace(next, { scroll: false });
  }, [
    isMounted,
    boardsLoading,
    isPlannerDeepLinkSyncPending,
    pathname,
    selectedBoardId,
    selectedSprintId,
    getBoardById,
    router,
    searchParamsKey,
  ]);

  useEffect(() => {
    const next = getPlannerPathSyncRedirectTarget({
      boardsLoading,
      isMounted,
      isPlannerDeepLinkSyncPending,
      pathname,
      searchParamsKey,
      selectedBoardId,
      selectedSprintId,
      sprints,
    });
    if (!next) return;
    router.replace(next, { scroll: false });
  }, [
    isMounted,
    boardsLoading,
    isPlannerDeepLinkSyncPending,
    pathname,
    selectedBoardId,
    selectedSprintId,
    router,
    searchParamsKey,
    sprints,
  ]);

  useEffect(() => {
    if (
      !shouldRedirectToSelectBoard({
        boardsLoading,
        getBoardById,
        isMounted,
        isPlannerDeepLink,
        plannerBoardId,
        selectedBoardId,
      })
    ) {
      return;
    }
    if (!boardsLoading && selectedBoardId != null && !getBoardById(selectedBoardId)) {
      setSelectedBoardId(null);
      setSelectedSprintIdState(null);
    }
    router.push('/select-board');
  }, [
    boardsLoading,
    getBoardById,
    isMounted,
    isPlannerDeepLink,
    plannerBoardId,
    router,
    selectedBoardId,
    setSelectedBoardId,
    setSelectedSprintIdState,
  ]);

  useEffect(() => {
    const action = resolveSprintListValidationAction({
      isPlannerDeepLinkSyncPending,
      selectedBoardId,
      sprintsLength: sprints.length,
    });
    if (action === 'clear-sprint') {
      setSelectedSprintIdState(null);
      return;
    }
    if (action === 'validate') {
      updateSprintIdWithValidation(sprints);
    }
  }, [isPlannerDeepLinkSyncPending, sprints, selectedBoardId, setSelectedSprintIdState, updateSprintIdWithValidation]);
}

export { canonicalPlannerUrl };
