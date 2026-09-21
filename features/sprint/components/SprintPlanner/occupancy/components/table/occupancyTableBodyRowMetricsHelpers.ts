import type { SidebarTasksTab, Task, TaskPosition } from '@/types';

import { mapStatus } from '@/utils/statusMapper';

function resolveUnplannedWarningFlags(params: {
  hasQa: boolean;
  hasStoryPoints: boolean;
  hasTestPoints: boolean;
  position: TaskPosition | undefined;
  qaPosition: TaskPosition | undefined;
  task: Pick<Task, 'originalTaskId'>;
}): { noDev: boolean; noQa: boolean } {
  const { task, position, qaPosition, hasQa, hasStoryPoints, hasTestPoints } = params;
  const noDev = !task.originalTaskId && !position;
  const qaPhasePlanned = hasQa ? !!qaPosition : !hasStoryPoints && hasTestPoints && !!position;
  const noQa = hasTestPoints && !qaPhasePlanned;
  return { noDev, noQa };
}

function unplannedWarningFromFlags(noDev: boolean, noQa: boolean): SidebarTasksTab | null {
  if (noDev && noQa) return 'all';
  if (noDev) return 'dev';
  if (noQa) return 'qa';
  return null;
}

function isRowTaskDone(task: Pick<Task, 'originalStatus' | 'status'>): boolean {
  return task.status === 'done' || mapStatus(task.originalStatus ?? '') === 'done';
}

export function computeUnplannedWarning(params: {
  hasQa: boolean;
  hasStoryPoints: boolean;
  hasTestPoints: boolean;
  position: TaskPosition | undefined;
  qaPosition: TaskPosition | undefined;
  task: Pick<Task, 'originalStatus' | 'originalTaskId' | 'status'>;
}): SidebarTasksTab | null {
  if (isRowTaskDone(params.task)) return null;
  const { noDev, noQa } = resolveUnplannedWarningFlags(params);
  return unplannedWarningFromFlags(noDev, noQa);
}

export function applyUnplannedWarningHeight(
  planRowHeight: number,
  rowMinHeight: number,
  unplannedWarning: SidebarTasksTab | null,
  legacyCompactLayout: boolean
): number {
  if (unplannedWarning == null || legacyCompactLayout) return planRowHeight;
  return Math.max(planRowHeight, rowMinHeight - 1 + 28);
}
