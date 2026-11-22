/**
 * Перенос задачи со страницы бэклога: между бэклогом и спринтами и между спринтами.
 * Задача сразу переезжает в кэшах колонок, затем идут запросы к трекеру; ошибка — колонки как были.
 * Карточку и стрелки в покинутом спринте убирает сервер (K4, `lib/sprints/issueBoardCards.ts`).
 */

import type { Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { backlogQueryKey, patchBacklogTasks } from '@/features/backlog/hooks/useBacklog';
import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { addIssueToSprint, removeIssueFromSprint } from '@/lib/beerTrackerApi';

/** Колонка страницы бэклога: спринт или сам бэклог. */
export type BacklogPlace = number | 'backlog';

interface BacklogMoveScope {
  boardId: number | null;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
}

interface ColumnTasks {
  tasks: Task[];
}

function columnKey(scope: BacklogMoveScope, place: BacklogPlace) {
  return place === 'backlog'
    ? backlogQueryKey(scope.boardId, scope.forDemoPlanner)
    : sprintTasksQueryKey(place, scope.boardId, scope.forDemoPlanner);
}

function patchColumn(scope: BacklogMoveScope, place: BacklogPlace, patch: (tasks: Task[]) => Task[]): void {
  if (place === 'backlog') {
    patchBacklogTasks(scope.queryClient, backlogQueryKey(scope.boardId, scope.forDemoPlanner), patch);
    return;
  }
  scope.queryClient.setQueryData<ColumnTasks>(columnKey(scope, place), (old) => (old ? { ...old, tasks: patch(old.tasks) } : old));
}

/** Колонка до переноса; кэша не было — после ошибки колонка просто перечитывается. */
function restoreColumn(scope: BacklogMoveScope, place: BacklogPlace, before: unknown): void {
  const key = columnKey(scope, place);
  if (before === undefined) {
    scope.queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
    return;
  }
  scope.queryClient.setQueryData(key, before);
}

/** Трекер ответил отказом без своей ошибки — вызывающий показывает общий текст. */
export class TrackerMoveRejectedError extends Error {}

async function moveInTracker(taskId: string, from: BacklogPlace, to: BacklogPlace): Promise<void> {
  if (from !== 'backlog' && !(await removeIssueFromSprint(taskId, from))) {
    throw new TrackerMoveRejectedError('removeIssueFromSprint failed');
  }
  if (to !== 'backlog' && !(await addIssueToSprint(taskId, to))) {
    throw new TrackerMoveRejectedError('addIssueToSprint failed');
  }
}

/** Перенести задачу из колонки в колонку. Бросает ошибку трекера после отката колонок. */
export async function moveBacklogTask(
  scope: BacklogMoveScope,
  move: { from: BacklogPlace; task: Task; to: BacklogPlace }
): Promise<void> {
  const { from, task, to } = move;
  if (from === to) return;
  const before = {
    from: scope.queryClient.getQueryData(columnKey(scope, from)),
    to: scope.queryClient.getQueryData(columnKey(scope, to)),
  };
  patchColumn(scope, from, (tasks) => tasks.filter((item) => item.id !== task.id));
  patchColumn(scope, to, (tasks) => (tasks.some((item) => item.id === task.id) ? tasks : [...tasks, task]));
  try {
    await moveInTracker(task.id, from, to);
  } catch (error) {
    restoreColumn(scope, from, before.from);
    restoreColumn(scope, to, before.to);
    throw error;
  }
}
