import type { SprintTab } from '@/components/PageHeader';
import type { SprintListItem } from '@/types/tracker';

import { buildPlannerPath, isPlannerPath, parsePlannerPath } from '@/lib/planner/plannerUrl';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import {
  isMainPageLoadingGatePending,
  resolveShowFullScreenLoadingFromGates,
} from './mainPageClientLoadingHelpers';

export { isSprintBoardTab } from './mainPageClientLoadingHelpers';

export function appendQuery(path: string, searchParamsKey: string): string {
  if (!searchParamsKey) {
    return path;
  }
  return `${path}?${searchParamsKey}`;
}

function pathWithQuery(pathname: string, searchParamsKey: string): string {
  return appendQuery(pathname, searchParamsKey);
}

export function canonicalPlannerUrl(
  boardId: number,
  sprintId: number,
  searchParamsKey: string
): string {
  return appendQuery(buildPlannerPath(boardId, sprintId), searchParamsKey);
}

/** Ключ `boardId-sprintId` из `/planner/:board/sprint/:sprint`, иначе null. */
export function plannerPathSelectionKey(pathname: string): string | null {
  const parsed = parsePlannerPath(pathname);
  if (!parsed) {
    return null;
  }
  return `${parsed.boardId}-${parsed.sprintId}`;
}

/**
 * Storage ещё не совпал с URL, либо props страницы отстают от pathname
 * (гонка App Router: `usePathname` обновляется раньше `use(params)` при `router.push` из уведомлений).
 * Пока true — нельзя path-sync'ить storage → URL, иначе откат на предыдущий спринт и цикл replace.
 */
export function isPlannerDeepLinkStorageSyncPending(params: {
  lastSyncedPlannerKey: string | null;
  pathname: string;
  plannerDeepLinkKey: string | null;
}): boolean {
  const pathKey = plannerPathSelectionKey(params.pathname);
  if (pathKey != null && pathKey !== params.lastSyncedPlannerKey) {
    return true;
  }
  return (
    pathKey != null &&
    params.plannerDeepLinkKey != null &&
    params.plannerDeepLinkKey !== pathKey
  );
}

/** URL → storage, если pathname планера ещё не записан в lastSynced. */
export function getPlannerPathStorageSync(params: {
  lastSyncedPlannerKey: string | null;
  pathname: string;
}): { boardId: number; key: string; sprintId: number } | null {
  const parsed = parsePlannerPath(params.pathname);
  if (!parsed) {
    return null;
  }
  const key = `${parsed.boardId}-${parsed.sprintId}`;
  if (key === params.lastSyncedPlannerKey) {
    return null;
  }
  return { boardId: parsed.boardId, key, sprintId: parsed.sprintId };
}

export function selectedSprintDisplayName(
  selectedSprint: SprintListItem | undefined,
  sprintInfo: { name?: string | null } | null
): string | null {
  if (selectedSprint) {
    return formatSprintListItemDisplayName(selectedSprint);
  }
  return sprintInfo?.name ?? null;
}

export function resolveSprintDataErrorMessage({
  sprintsError,
  tasksError,
  t,
}: {
  sprintsError: unknown;
  tasksError: unknown;
  t: (key: string) => string;
}): string | null {
  if (!sprintsError && !tasksError) {
    return null;
  }
  if (sprintsError instanceof Error) {
    return sprintsError.message;
  }
  if (tasksError instanceof Error) {
    return tasksError.message;
  }
  return t('sprint.errors.genericLoad');
}

function isPlannerRedirectBlocked(params: {
  boardsLoading: boolean;
  isMounted: boolean;
  isPlannerDeepLinkSyncPending: () => boolean;
}): boolean {
  return !params.isMounted || params.boardsLoading || params.isPlannerDeepLinkSyncPending();
}

function resolvePlannerUrlRedirect(
  next: string,
  pathname: string,
  searchParamsKey: string
): string | null {
  const current = pathWithQuery(pathname, searchParamsKey);
  return next === current ? null : next;
}

export function getCanonicalPlannerRedirectTarget(params: {
  boardsLoading: boolean;
  getBoardById: (id: number) => unknown;
  isMounted: boolean;
  isPlannerDeepLinkSyncPending: () => boolean;
  pathname: string;
  searchParamsKey: string;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
}): string | null {
  if (isPlannerRedirectBlocked(params)) return null;
  if (params.pathname !== '/') return null;
  if (params.selectedBoardId == null || params.selectedSprintId == null) return null;
  if (!params.getBoardById(params.selectedBoardId)) return null;
  const next = canonicalPlannerUrl(params.selectedBoardId, params.selectedSprintId, params.searchParamsKey);
  return resolvePlannerUrlRedirect(next, params.pathname, params.searchParamsKey);
}

function isPlannerPathInSync(
  pathname: string,
  selectedBoardId: number,
  selectedSprintId: number
): boolean {
  const parsed = parsePlannerPath(pathname);
  if (!parsed) return true;
  return parsed.boardId === selectedBoardId && parsed.sprintId === selectedSprintId;
}

function sprintListIncludesId(sprints: Array<{ id: number }>, sprintId: number): boolean {
  return sprints.some((sprint) => Number(sprint.id) === Number(sprintId));
}

/**
 * Нельзя переписывать URL, если спринт из pathname есть в списке доски:
 * иначе fallback на in_progress / storage откатывает переход из уведомления
 * на запущенный спринт и гоняет replace между двумя id.
 */
export function shouldKeepPlannerPathSprint(params: {
  pathname: string;
  sprints: Array<{ id: number }>;
}): boolean {
  if (params.sprints.length === 0) {
    return true;
  }
  const parsed = parsePlannerPath(params.pathname);
  if (!parsed) {
    return false;
  }
  return sprintListIncludesId(params.sprints, parsed.sprintId);
}

export function getPlannerPathSyncRedirectTarget(params: {
  boardsLoading: boolean;
  isMounted: boolean;
  isPlannerDeepLinkSyncPending: () => boolean;
  pathname: string;
  searchParamsKey: string;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  sprints: Array<{ id: number }>;
}): string | null {
  if (isPlannerRedirectBlocked(params)) return null;
  if (!isPlannerPath(params.pathname)) return null;
  if (params.selectedBoardId == null || params.selectedSprintId == null) return null;
  if (shouldKeepPlannerPathSprint(params)) {
    return null;
  }
  if (isPlannerPathInSync(params.pathname, params.selectedBoardId, params.selectedSprintId)) {
    return null;
  }
  const next = canonicalPlannerUrl(params.selectedBoardId, params.selectedSprintId, params.searchParamsKey);
  return resolvePlannerUrlRedirect(next, params.pathname, params.searchParamsKey);
}

function isKnownPlannerBoard(
  getBoardById: (id: number) => unknown,
  boardId: number | null | undefined
): boolean {
  return boardId != null && Boolean(getBoardById(boardId));
}

/**
 * Доска из session/localStorage, только если она есть в GET /api/boards (команды org).
 * Иначе не дергаем Tracker со старым id (другой провайдер / другая org).
 */
export function resolvePlannerQueryBoardId(params: {
  boardsLoading: boolean;
  getBoardById: (id: number) => unknown;
  selectedBoardId: number | null;
}): number | null {
  if (params.boardsLoading || params.selectedBoardId == null) {
    return null;
  }
  return isKnownPlannerBoard(params.getBoardById, params.selectedBoardId)
    ? params.selectedBoardId
    : null;
}

export function shouldRedirectToSelectBoard(params: {
  boardsLoading: boolean;
  getBoardById: (id: number) => unknown;
  isMounted: boolean;
  isPlannerDeepLink: boolean;
  plannerBoardId?: number;
  selectedBoardId: number | null;
}): boolean {
  if (!params.isMounted) return false;
  if (params.isPlannerDeepLink && params.boardsLoading) return false;
  if (params.isPlannerDeepLink && isKnownPlannerBoard(params.getBoardById, params.plannerBoardId)) {
    return false;
  }
  if (!params.selectedBoardId) return true;
  if (params.boardsLoading) return false;
  return !isKnownPlannerBoard(params.getBoardById, params.selectedBoardId);
}

type SprintListValidationAction = 'clear-sprint' | 'noop' | 'validate';

export function resolveSprintListValidationAction(params: {
  isPlannerDeepLinkSyncPending: () => boolean;
  selectedBoardId: number | null;
  sprintsLength: number;
}): SprintListValidationAction {
  if (params.isPlannerDeepLinkSyncPending()) return 'noop';
  if (!params.selectedBoardId) return 'clear-sprint';
  if (params.sprintsLength === 0) return 'noop';
  return 'validate';
}

export function resolveShowFullScreenLoading(params: {
  activeTab: SprintTab;
  boardsLoading: boolean;
  boardSwitchPending: boolean;
  isMounted: boolean;
  positionsPending: boolean;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  sprintsLoading: boolean;
  tasksPending: boolean;
}): boolean {
  return resolveShowFullScreenLoadingFromGates({
    activeTab: params.activeTab,
    boardsLoading: params.boardsLoading,
    boardSwitchPending: params.boardSwitchPending,
    isMounted: params.isMounted,
    selectedBoardId: params.selectedBoardId,
    sprintBoardGatesPending: isMainPageLoadingGatePending(params),
  });
}
