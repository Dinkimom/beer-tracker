import type { SprintTab } from '@/components/PageHeader';

import { reaction } from 'mobx';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { useSprints } from '@/features/sprint/hooks/useSprints';
import { useSprintTasksBackgroundRefresh } from '@/features/task/hooks/useSprintTasksBackgroundRefresh';
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
  activeTab: SprintTab;
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
  const sprintInfo = resolvePlannerSprintInfo(
    tasksData?.sprintInfo,
    sprints.find((sprint) => sprint.id === sprintId)
  );
  useSprintTasksBackgroundRefresh(sprintId, boardId, sprintInfo?.status);

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
    positionsPending,
    reloadTasksMutation,
    sprints,
    sprintsError,
    sprintsLoading,
    tasks: tasksData?.tasks ?? [],
    tasksError,
    tasksLoading,
    tasksPending,
    sprintInfo,
  };
}
