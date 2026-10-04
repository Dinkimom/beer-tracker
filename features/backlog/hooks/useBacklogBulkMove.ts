'use client';

import type { Developer, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';

import { useBacklogSelection } from '../components/BacklogSelectionProvider';
import {
  backlogBulkMoveFeedback,
  locateBacklogSelections,
  planBacklogBulkDestination,
  runBacklogBulkMoves,
  type BacklogLocatedTask,
} from '../utils/backlogBulkMove';

import { getSprintTasksData } from './backlogDragAndDropHelpers';
import { moveTaskToBacklog, moveTaskToSprint } from './backlogDragAndDropMoveHelpers';

interface LocatedMove {
  sourceSprintId: number | null;
  task: Task;
  taskId: string;
}

function readSprintTasks(
  queryClient: QueryClient,
  sprints: readonly SprintListItem[],
  boardId: number | null,
  forDemoPlanner: boolean
): Map<number, Task[]> {
  const sprintTasks = new Map<number, Task[]>();
  for (const sprint of sprints) {
    sprintTasks.set(sprint.id, getSprintTasksData(queryClient, sprint.id, boardId, forDemoPlanner)?.tasks ?? []);
  }
  return sprintTasks;
}

function hydrateLocations(
  locations: readonly BacklogLocatedTask[],
  backlogTasks: readonly Task[],
  sprintTasks: ReadonlyMap<number, readonly Task[]>
): { missingIds: string[]; moves: LocatedMove[] } {
  const moves: LocatedMove[] = [];
  const missingIds: string[] = [];
  for (const location of locations) {
    const pool =
      location.sourceSprintId == null ? backlogTasks : (sprintTasks.get(location.sourceSprintId) ?? []);
    const task = pool.find((item) => item.id === location.taskId);
    if (!task) {
      missingIds.push(location.taskId);
      continue;
    }
    moves.push({ sourceSprintId: location.sourceSprintId, task, taskId: location.taskId });
  }
  return { missingIds, moves };
}

async function moveSelectedBacklogTask(input: {
  addTask: (task: Task) => void;
  backlogDevelopers: Developer[];
  boardId: number | null;
  destination: 'backlog' | 'sprint';
  forDemoPlanner: boolean;
  item: LocatedMove;
  queryClient: QueryClient;
  removeTask: (taskId: string) => void;
  t: (key: string, params?: Record<string, number | string>) => string;
  targetSprintId: number | undefined;
}): Promise<void> {
  if (input.destination === 'backlog') {
    if (input.item.sourceSprintId == null) {
      throw new Error(input.t('common.unknownError'));
    }
    await moveTaskToBacklog({
      addTask: input.addTask,
      boardId: input.boardId,
      forDemoPlanner: input.forDemoPlanner,
      queryClient: input.queryClient,
      quiet: true,
      removeTask: input.removeTask,
      sourceSprintId: input.item.sourceSprintId,
      t: input.t,
      taskId: input.item.taskId,
      taskToMove: input.item.task,
    });
    return;
  }
  if (input.targetSprintId == null) {
    throw new Error(input.t('common.unknownError'));
  }
  await moveTaskToSprint({
    addTask: input.addTask,
    backlogDevelopers: input.backlogDevelopers,
    boardId: input.boardId,
    forDemoPlanner: input.forDemoPlanner,
    queryClient: input.queryClient,
    quiet: true,
    removeTask: input.removeTask,
    sourceSprintId: input.item.sourceSprintId,
    t: input.t,
    targetSprintId: input.targetSprintId,
    taskId: input.item.taskId,
    taskToMove: input.item.task,
    wasInBacklog: input.item.sourceSprintId == null,
  });
}

interface UseBacklogBulkMoveInput {
  activeSprints: SprintListItem[];
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  boardId: number | null;
  movingRef: { current: boolean };
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
}

export function useBacklogBulkMove({
  activeSprints,
  addTask,
  backlogDevelopers,
  backlogTasks,
  boardId,
  movingRef,
  removeTask,
}: UseBacklogBulkMoveInput) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const { selectedIds, unselect } = useBacklogSelection();
  const [moving, setMoving] = useState(false);

  const showFeedback = useCallback(
    (destination: 'backlog' | 'sprint', moved: number, failed: number) => {
      const feedback = backlogBulkMoveFeedback({ destination, failed, moved });
      const message = t(feedback.key, feedback.params);
      if (failed > 0) toast.error(message);
      else if (moved === 0) toast(message);
      else toast.success(message);
    },
    [t]
  );

  const run = useCallback(
    async (destination: 'backlog' | 'sprint', targetSprintId?: number) => {
      if (movingRef.current) return;
      const sprintTasks = readSprintTasks(queryClient, activeSprints, boardId, forDemoPlanner);
      const located = locateBacklogSelections(selectedIds, backlogTasks, sprintTasks);
      const planned = planBacklogBulkDestination(destination, located.locations, targetSprintId);
      if (!planned) return;
      const hydrated = hydrateLocations(planned.items, backlogTasks, sprintTasks);
      const alreadyMissing = located.missingIds.length + hydrated.missingIds.length;
      if (hydrated.moves.length === 0 && alreadyMissing === 0) {
        unselect(planned.skippedIds);
        showFeedback(destination, 0, 0);
        return;
      }

      movingRef.current = true;
      setMoving(true);
      try {
        const result = await runBacklogBulkMoves(hydrated.moves, (item) =>
          moveSelectedBacklogTask({
            addTask,
            backlogDevelopers,
            boardId,
            destination,
            forDemoPlanner,
            item,
            queryClient,
            removeTask,
            t,
            targetSprintId,
          })
        );
        unselect([...result.movedIds, ...planned.skippedIds]);
        showFeedback(destination, result.movedIds.length, result.failed + alreadyMissing);
      } finally {
        movingRef.current = false;
        setMoving(false);
      }
    },
    [
      activeSprints,
      addTask,
      backlogDevelopers,
      backlogTasks,
      boardId,
      forDemoPlanner,
      movingRef,
      queryClient,
      removeTask,
      selectedIds,
      showFeedback,
      t,
      unselect,
    ]
  );

  const moveToSprint = useCallback((targetSprintId: number) => run('sprint', targetSprintId), [run]);
  const moveToBacklog = useCallback(() => run('backlog'), [run]);

  return { moveToBacklog, moveToSprint, moving };
}
