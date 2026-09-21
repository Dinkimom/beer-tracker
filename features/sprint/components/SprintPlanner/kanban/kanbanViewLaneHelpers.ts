import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { Developer, Task, TaskParent } from '@/types';
import type { BoardColumn } from '@/types/tracker';
import type { DragEndEvent } from '@dnd-kit/core';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';

import { addTaskToKanbanAssigneeLane } from './kanbanAssigneeLaneHelpers';
import {
  buildKanbanColumnKeysNorm,
} from './kanbanColumnTransitionHelpers';
import {
  getColumnStatusKey,
  normalizeStatusKeyForComparison,
} from './kanbanDndUtils';
import { resolveKanbanDragEndTarget } from './kanbanDragEndResolveHelpers';
import { KANBAN_UNKNOWN_STATUS_COLUMN_ID } from './kanbanGroupTasksHelpers';

export function buildKanbanAssigneeLanes(
  tasksForKanban: Task[],
  developers: Developer[]
): Array<{ assigneeKey: string; assigneeName: string; developer: Developer | null; tasks: Task[] }> {
  const keyToLane = new Map<string, { assigneeName: string; developer: Developer | null; tasks: Task[] }>();
  for (const task of tasksForKanban) {
    addTaskToKanbanAssigneeLane(keyToLane, task, developers);
  }
  const ordered: Array<{ assigneeKey: string; assigneeName: string; developer: Developer | null; tasks: Task[] }> = [];
  for (const d of developers) {
    const lane = keyToLane.get(d.id);
    if (lane) {
      ordered.push({ assigneeKey: d.id, ...lane });
      keyToLane.delete(d.id);
    }
  }
  const unassigned = keyToLane.get('__unassigned__');
  if (unassigned) {
    ordered.push({ assigneeKey: '__unassigned__', ...unassigned });
    keyToLane.delete('__unassigned__');
  }
  keyToLane.forEach((lane, key) => {
    ordered.push({
      assigneeKey: key,
      assigneeName: lane.assigneeName,
      developer: lane.developer,
      tasks: lane.tasks,
    });
  });
  return ordered;
}

function resolveIssueKeyFromSelf(self?: TaskParent['self']): string | undefined {
  if (!self || typeof self !== 'string') return undefined;
  const m = self.match(/\/issues\/([^/?#]+)/i);
  const raw = m?.[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Как в занятости: ключ тикета = parent.key, иначе из parent.self. */
function resolveKanbanParentIssueKey(parent?: TaskParent): string | undefined {
  const k = parent?.key?.trim();
  if (k) return k;
  return resolveIssueKeyFromSelf(parent?.self);
}

interface KanbanParentLane {
  laneName: string;
  parentDisplay?: string;
  parentKey?: string;
  tasks: Task[];
}

/** Как в занятости (`buildFlattenedRows`): группа = parent ?? epic. */
function resolveKanbanParentLaneMeta(task: Task): {
  key: string;
  laneName: string;
  parentDisplay?: string;
  parentKey?: string;
} {
  const parent = task.parent ?? task.epic;
  if (!parent) {
    return { key: '__no_parent__', laneName: TASK_GROUP_KEY_NO_PARENT };
  }
  const parentKey = resolveKanbanParentIssueKey(parent);
  const parentDisplay =
    (parent.display || parent.key || parentKey || '').trim() || undefined;
  const key = (parent.id || parent.key || parentKey || '').trim() || '__no_parent__';
  const laneName =
    (parent.display || parent.key || parentKey || TASK_GROUP_KEY_NO_PARENT).trim() ||
    TASK_GROUP_KEY_NO_PARENT;
  return { key, laneName, parentKey, parentDisplay };
}

export function buildKanbanParentLanes(
  tasksForKanban: Task[]
): Array<{ laneKey: string; laneName: string; parentKey?: string; parentDisplay?: string; tasks: Task[] }> {
  const keyToLane = new Map<string, KanbanParentLane>();
  for (const t of tasksForKanban) {
    const { key, laneName, parentKey, parentDisplay } = resolveKanbanParentLaneMeta(t);
    if (!keyToLane.has(key)) {
      keyToLane.set(key, { laneName, parentKey, parentDisplay, tasks: [] });
    }
    keyToLane.get(key)!.tasks.push(t);
  }
  const ordered: Array<{ laneKey: string; laneName: string; parentKey?: string; parentDisplay?: string; tasks: Task[] }> = [];
  const noParent = keyToLane.get('__no_parent__');
  keyToLane.forEach((lane, key) => {
    if (key !== '__no_parent__') {
      ordered.push({ laneKey: key, laneName: lane.laneName, parentKey: lane.parentKey, parentDisplay: lane.parentDisplay, tasks: lane.tasks });
    }
  });
  if (noParent) {
    ordered.push({ laneKey: '__no_parent__', laneName: noParent.laneName, tasks: noParent.tasks });
  }
  return ordered;
}

function applyKanbanStatusTransition(
  taskId: string,
  column: BoardColumn,
  transition: TransitionItem,
  onStatusChange: NonNullable<Parameters<typeof handleKanbanDragEndStatusChange>[4]>
): void {
  const targetStatusKey = transition.to?.key ?? getColumnStatusKey(column);
  const targetDisplay = column.display ?? (transition.to as { display?: string })?.display;
  const screenId = (transition as { screen?: { id: string } }).screen?.id;
  onStatusChange(taskId, transition.id, targetStatusKey ?? undefined, targetDisplay, screenId);
}

export function handleKanbanDragEndStatusChange(
  event: DragEndEvent,
  tasksForKanban: Task[],
  columnsWithTasks: Array<{ column: BoardColumn; tasks: Task[] }>,
  transitionsForActive: TransitionItem[],
  onStatusChange?: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>
): string | null {
  if (!onStatusChange) return null;

  const target = resolveKanbanDragEndTarget(
    event,
    tasksForKanban,
    columnsWithTasks,
    transitionsForActive
  );
  if (!target) return null;

  applyKanbanStatusTransition(target.taskId, target.column, target.transition, onStatusChange);
  return target.taskId;
}

export function kanbanColumnAllowsDrop(
  column: BoardColumn,
  transitionsForActive: TransitionItem[]
): boolean {
  if (column.id === KANBAN_UNKNOWN_STATUS_COLUMN_ID) return false;
  const columnKeysNorm = buildKanbanColumnKeysNorm(column);
  if (!columnKeysNorm.size) return false;
  return transitionsForActive.some((t) => {
    const toKeyNorm = normalizeStatusKeyForComparison(t.to?.key || '');
    return toKeyNorm && columnKeysNorm.has(toKeyNorm);
  });
}
