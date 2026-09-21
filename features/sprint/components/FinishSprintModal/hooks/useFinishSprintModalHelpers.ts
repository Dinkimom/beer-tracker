import type { MoveTasksTo, Task } from '@/types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

import toast from 'react-hot-toast';

import { updateSprintStatus } from '@/lib/beerTrackerApi';
import { compareSprintNamesByNumberDesc } from '@/utils/sprintDisplayName';

type FinishSprintMoveCandidate = Pick<
  SprintListItem,
  'archived' | 'id' | 'name' | 'startDate' | 'status'
>;

export function isFinishSprintTransferTarget(sprint: FinishSprintMoveCandidate): boolean {
  return (sprint.status === 'draft' || sprint.status === 'Draft') && !sprint.archived;
}

function sprintStartMs(startDate: string | undefined): number | null {
  if (!startDate) return null;
  const ms = Date.parse(startDate);
  return Number.isFinite(ms) ? ms : null;
}

function compareFinishSprintDrafts(
  left: FinishSprintMoveCandidate,
  right: FinishSprintMoveCandidate
): number {
  const leftStart = sprintStartMs(left.startDate);
  const rightStart = sprintStartMs(right.startDate);
  if (leftStart !== null && rightStart !== null && leftStart !== rightStart) {
    return leftStart - rightStart;
  }
  if (leftStart !== null && rightStart === null) return -1;
  if (leftStart === null && rightStart !== null) return 1;
  return compareSprintNamesByNumberDesc(right.name, left.name);
}

function isDraftSprintAfterCurrent(
  draft: FinishSprintMoveCandidate,
  current: FinishSprintMoveCandidate
): boolean {
  const draftStart = sprintStartMs(draft.startDate);
  const currentStart = sprintStartMs(current.startDate);
  if (draftStart !== null && currentStart !== null && draftStart !== currentStart) {
    return draftStart > currentStart;
  }
  return compareSprintNamesByNumberDesc(current.name, draft.name) > 0;
}

export function resolveFinishSprintDefaultMoveTarget(params: {
  currentSprintId: number | null;
  sprints: FinishSprintMoveCandidate[];
}): { moveTasksTo: MoveTasksTo; selectedSprintId: number | null } {
  const drafts = params.sprints.filter(isFinishSprintTransferTarget);
  if (drafts.length === 0) {
    return { moveTasksTo: 'backlog', selectedSprintId: null };
  }

  const current = params.currentSprintId == null
    ? undefined
    : params.sprints.find((sprint) => sprint.id === params.currentSprintId);
  const sortedDrafts = [...drafts].sort(compareFinishSprintDrafts);

  let nextSprint: FinishSprintMoveCandidate | undefined;
  if (current) {
    nextSprint = sortedDrafts.find((sprint) => isDraftSprintAfterCurrent(sprint, current));
  } else if (sortedDrafts.length === 1) {
    nextSprint = sortedDrafts[0];
  }

  if (!nextSprint) {
    return { moveTasksTo: 'backlog', selectedSprintId: null };
  }

  return { moveTasksTo: 'sprint', selectedSprintId: nextSprint.id };
}

export function isTaskClosedForSprintFinish(task: Task): boolean {
  return (task.originalStatus ?? '').trim().toLowerCase() === 'closed';
}

export function getTasksToMoveOnSprintFinish(tasks: Task[], goalTaskIds: Set<string>): Task[] {
  return tasks.filter((task) => {
    if (goalTaskIds.has(task.id)) return false;
    return !isTaskClosedForSprintFinish(task);
  });
}

export function validateFinishSprintSubmit(params: {
  moveTasksTo: MoveTasksTo;
  selectedSprintId: number | null;
  sprintInfo: { id: number; status: string; version?: number } | null;
}): boolean {
  if (!params.sprintInfo) return false;

  if (params.moveTasksTo === 'sprint' && !params.selectedSprintId) {
    toast.error('Необходимо выбрать спринт для переноса задач');
    return false;
  }

  return true;
}

export async function archiveSprintOnFinish(params: {
  onSprintStatusChange?: (updatedSprint: SprintInfo) => void;
  onTasksReload?: () => void;
  sprintInfo: { id: number; status: string; version?: number };
}): Promise<boolean> {
  const result = await updateSprintStatus(params.sprintInfo.id, 'archived', params.sprintInfo.version);

  const closed = result.sprint?.status === 'archived' || result.sprint?.status === 'released';
  if (!result.success || !closed) {
    toast.error(result.error || 'Не удалось завершить спринт');
    return false;
  }

  toast.success('Спринт закрыт');

  if (result.sprint && params.onSprintStatusChange) {
    params.onSprintStatusChange(result.sprint);
  }
  if (params.onTasksReload) {
    params.onTasksReload();
  }

  return true;
}
