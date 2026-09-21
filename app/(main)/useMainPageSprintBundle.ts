import { reaction } from 'mobx';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { useSprintGoals } from '@/features/sprint/hooks/useSprintGoals';
import { useSprints } from '@/features/sprint/hooks/useSprints';
import { useReloadTasks } from '@/features/task/hooks/useTaskMutations';
import { useTasks } from '@/features/task/hooks/useTasks';
import { useSprintBoardListsGateReady } from '@/hooks/useSprintBoardListsGateReady';
import { useRootStore } from '@/lib/layers';
import { resolvePlannerSprintInfo } from '@/lib/sprints/sprintInfoFromListItem';

import { isSprintBoardTab } from './mainPageClientHelpers';
import { isSprintPositionsGatePending } from './mainPageClientLoadingHelpers';

function resolveSprintQueryIds(selectedBoardId: number | null, selectedSprintId: number | null) {
  return {
    boardId: selectedBoardId,
    sprintId: selectedSprintId,
  };
}

function useMainPageSprintGoals(selectedSprintId: number | null, enabled: boolean) {
  const sprintId = enabled ? selectedSprintId : null;
  const delivery = useSprintGoals(sprintId, 'delivery');
  const discovery = useSprintGoals(sprintId, 'discovery');
  return { delivery, discovery };
}

function useSprintPositionsPending(sprintId: number | null): boolean {
  const { taskPositions } = useRootStore();
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      reaction(
        () => [taskPositions.positionsLoadPending, taskPositions.positionsSettledSprintId].join(':'),
        onStoreChange
      ),
    [taskPositions]
  );
  const getSnapshot = useCallback(
    () =>
      isSprintPositionsGatePending({
        positionsLoadPending: taskPositions.positionsLoadPending,
        positionsSettledSprintId: taskPositions.positionsSettledSprintId,
        selectedSprintId: sprintId,
      }),
    [sprintId, taskPositions]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useMainPageSprintBundle({
  activeTab,
  selectedBoardId,
  selectedSprintId,
}: {
  activeTab: 'backlog' | 'board' | 'burndown';
  selectedBoardId: number | null;
  selectedSprintId: number | null;
}) {
  const { sprintId, boardId } = resolveSprintQueryIds(selectedBoardId, selectedSprintId);
  const { data: sprints = [], isLoading: sprintsLoading, error: sprintsError } = useSprints(selectedBoardId);
  const {
    data: tasksData,
    isLoading: tasksLoading,
    isPending: tasksPending,
    error: tasksError,
  } = useTasks(sprintId, boardId);

  const { delivery, discovery } = useMainPageSprintGoals(selectedSprintId, true);
  const reloadTasksMutation = useReloadTasks(selectedSprintId, selectedBoardId);
  const { taskPositions } = useRootStore();
  const boardTabSprintId = isSprintBoardTab(activeTab) ? selectedSprintId : null;
  const positionsPending = useSprintPositionsPending(boardTabSprintId);
  useSprintBoardListsGateReady(boardTabSprintId);

  useEffect(() => {
    if (boardTabSprintId == null) return;
    taskPositions.loadSprint(boardTabSprintId).catch((err) => {
      console.error('Error loading task positions:', err);
    });
  }, [boardTabSprintId, taskPositions]);

  return {
    deliveryGoalsData: delivery.data,
    deliveryGoalsLoading: delivery.isLoading,
    discoveryGoalsData: discovery.data,
    discoveryGoalsLoading: discovery.isLoading,
    positionsPending,
    reloadTasksMutation,
    sprints,
    sprintsError,
    sprintsLoading,
    tasks: tasksData?.tasks ?? [],
    tasksError,
    tasksLoading,
    tasksPending,
    sprintInfo: resolvePlannerSprintInfo(
      tasksData?.sprintInfo,
      sprints.find((sprint) => sprint.id === sprintId)
    ),
  };
}
