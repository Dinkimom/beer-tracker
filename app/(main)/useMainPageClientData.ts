import { useCallback, useEffect } from 'react';

import { useSelectedBoardStorage, useSelectedSprintStorage } from '@/hooks/useLocalStorage';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { parsePlannerPath } from '@/lib/planner/plannerUrl';
import { resolveValidatedSprintId } from '@/lib/planner/resolveValidatedSprintId';

import {
  resolvePlannerQueryBoardId,
  resolveShowFullScreenLoading,
  resolveSprintDataErrorMessage,
  selectedSprintDisplayName,
} from './mainPageClientHelpers';
import { canonicalPlannerUrl, useMainPageClientRedirects } from './useMainPageClientRedirects';
import { useMainPageSprintBundle } from './useMainPageSprintBundle';

export function useMainPageClientData({
  activeTab,
  boardsLoading,
  boardSwitchPending,
  getBoardById,
  isMounted,
  isPlannerDeepLink,
  pathname,
  plannerBoardId,
  plannerDeepLinkKey,
  plannerSprintId,
  router,
  searchParamsKey,
  t,
}: {
  activeTab: 'backlog' | 'board' | 'burndown';
  boardsLoading: boolean;
  boardSwitchPending: boolean;
  getBoardById: (id: number) => unknown;
  isMounted: boolean;
  isPlannerDeepLink: boolean;
  pathname: string;
  plannerBoardId?: number;
  plannerDeepLinkKey: string | null;
  plannerSprintId?: number;
  router: { push: (url: string) => void; replace: (url: string, opts?: { scroll: boolean }) => void };
  searchParamsKey: string;
  t: (key: string) => string;
}) {
  const [storedBoardId, setSelectedBoardId] = useSelectedBoardStorage();
  const [storedSprintId, setSelectedSprintIdState] = useSelectedSprintStorage();
  const queryBoardId = resolvePlannerQueryBoardId({
    boardsLoading,
    getBoardById,
    selectedBoardId: storedBoardId,
  });
  const querySprintId = queryBoardId != null ? storedSprintId : null;

  const updateSprintIdWithValidation = useCallback(
    (sprints: Array<{ id: number; status?: string; archived?: boolean }>) => {
      const urlSprintId = parsePlannerPath(pathname)?.sprintId ?? null;
      setSelectedSprintIdState((currentSprintId) => {
        const next = resolveValidatedSprintId(currentSprintId, sprints, urlSprintId);
        if (
          currentSprintId != null &&
          next !== currentSprintId &&
          !sprints.some((s) => s.id === currentSprintId)
        ) {
          console.warn(`Сохраненный спринт ${currentSprintId} не найден в списке, выбираем новый`);
        }
        return next;
      });
    },
    [pathname, setSelectedSprintIdState]
  );

  const sprintBundle = useMainPageSprintBundle({
    activeTab,
    selectedBoardId: queryBoardId,
    selectedSprintId: querySprintId,
  });
  const {
    deliveryGoalsData,
    deliveryGoalsLoading,
    discoveryGoalsData,
    discoveryGoalsLoading,
    positionsPending,
    reloadTasksMutation,
    sprintInfo,
    sprints,
    sprintsError,
    sprintsLoading,
    tasks,
    tasksError,
    tasksLoading,
    tasksPending,
  } = sprintBundle;
  const effectiveSprintId = querySprintId ?? plannerSprintId ?? null;
  const selectedSprintFromList = sprints.find((s) => s.id === effectiveSprintId);
  const selectedSprintName = selectedSprintDisplayName(selectedSprintFromList, sprintInfo);

  useEffect(() => {
    if (!selectedSprintName?.trim()) return;
    document.title = selectedSprintName.trim();
  }, [selectedSprintName]);

  useMainPageClientRedirects({
    boardsLoading,
    getBoardById,
    isMounted,
    isPlannerDeepLink,
    pathname,
    plannerBoardId,
    plannerDeepLinkKey,
    router,
    searchParamsKey,
    selectedBoardId: storedBoardId,
    selectedSprintId: storedSprintId,
    setSelectedBoardId,
    setSelectedSprintIdState,
    sprints,
    updateSprintIdWithValidation,
  });

  const productTenant = useProductTenantOrganizations();

  const error = resolveSprintDataErrorMessage({
    sprintsError,
    tasksError,
    t,
  });

  const showFullScreenLoading = resolveShowFullScreenLoading({
    activeTab,
    boardsLoading,
    boardSwitchPending,
    isMounted,
    positionsPending,
    selectedBoardId: queryBoardId,
    selectedSprintId: querySprintId,
    sprintsLoading,
    tasksPending,
  });

  const handleSprintChange = useCallback(
    (sprintId: number | null) => {
      setSelectedSprintIdState(sprintId);
      if (queryBoardId != null && sprintId != null) {
        router.replace(canonicalPlannerUrl(queryBoardId, sprintId, searchParamsKey), { scroll: false });
      }
    },
    [setSelectedSprintIdState, queryBoardId, router, searchParamsKey]
  );

  const checklistDone =
    (deliveryGoalsData?.checklistDone ?? 0) + (discoveryGoalsData?.checklistDone ?? 0);
  const checklistTotal =
    (deliveryGoalsData?.checklistTotal ?? 0) + (discoveryGoalsData?.checklistTotal ?? 0);

  return {
    checklistDone,
    checklistTotal,
    deliveryChecklistItems: deliveryGoalsData?.checklistItems ?? [],
    deliveryGoalsLoading,
    discoveryChecklistItems: discoveryGoalsData?.checklistItems ?? [],
    discoveryGoalsLoading,
    error,
    goalTaskIds: tasks.filter((task) => task.type === 'goal').map((task) => task.id),
    goalsLoading: deliveryGoalsLoading || discoveryGoalsLoading,
    loading: tasksLoading,
    productTenant,
    reloadTasksMutation,
    selectedBoardId: queryBoardId,
    selectedSprintId: querySprintId,
    setSelectedBoardId,
    setSelectedSprintId: setSelectedSprintIdState,
    showFullScreenLoading,
    sprintInfo,
    sprints,
    sprintsLoading,
    tasks,
    tasksPending,
    handleSprintChange,
  };
}
