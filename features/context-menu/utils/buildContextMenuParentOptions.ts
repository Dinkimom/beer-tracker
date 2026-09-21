import type { Task, TaskParent } from '@/types';

import { humanFeatureDraftParentDisplay } from '@/features/swimlane/utils/featureDraftParentLabel';
import {
  collectUniqueSprintParentTasks,
  trimmedTaskParentToken,
} from '@/features/task/components/TaskBar/components/quickAddMenu/collectUniqueSprintParentTasks';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

function resolveParentKey(parent: TaskParent): string | null {
  const key = trimmedTaskParentToken(parent.key) || trimmedTaskParentToken(parent.id);
  return key || null;
}

function humanDraftParentDisplay(parent: TaskParent, key: string): string {
  return humanFeatureDraftParentDisplay(trimmedTaskParentToken(parent.display), key);
}

/** Текущий родитель задачи для UI (parent, иначе epic). */
export function resolveTaskParentForMenu(task: Task): TaskParent | null {
  const parentOrEpic = task.parent ?? task.epic;
  if (!parentOrEpic) {
    return null;
  }
  const key = resolveParentKey(parentOrEpic);
  if (!key) {
    return null;
  }
  const isDraft = isFeatureLaneDraftRowId(key);
  const display = isDraft
    ? humanDraftParentDisplay(parentOrEpic, key)
    : trimmedTaskParentToken(parentOrEpic.display) || key;
  return {
    display,
    id: trimmedTaskParentToken(parentOrEpic.id) || key,
    key,
    self: parentOrEpic.self,
  };
}

export function formatContextMenuParentLabel(parent: TaskParent): string {
  const key = trimmedTaskParentToken(parent.key) || trimmedTaskParentToken(parent.id);
  const display = trimmedTaskParentToken(parent.display);
  if (isFeatureLaneDraftRowId(key) || isFeatureLaneDraftRowId(trimmedTaskParentToken(parent.id))) {
    return humanDraftParentDisplay(parent, key);
  }
  if (key && display && display !== key) {
    return `${key} — ${display}`;
  }
  return display || key;
}

/**
 * Варианты родителя для контекстного меню: уникальные parent/epic задач спринта,
 * плюс текущий родитель задачи, если его ещё нет в списке.
 */
export function buildContextMenuParentOptions(
  sprintTasks: readonly Task[],
  currentTask: Task
): TaskParent[] {
  const options = collectUniqueSprintParentTasks(sprintTasks);
  const current = resolveTaskParentForMenu(currentTask);
  if (!current) {
    return options;
  }
  if (options.some((parent) => parent.key === current.key)) {
    return options;
  }
  if (isFeatureLaneDraftRowId(current.key) && !formatContextMenuParentLabel(current)) {
    return options;
  }
  return [current, ...options].sort((a, b) =>
    a.display.localeCompare(b.display, undefined, { sensitivity: 'base' })
  );
}

/** Подпись текущего родителя: имя драфта, без внутреннего feature-draft id. */
export function resolveContextMenuCurrentParentLabel(
  task: Task,
  parentOptions: readonly TaskParent[]
): string {
  const current = resolveTaskParentForMenu(task);
  if (!current) {
    return '';
  }
  const fromCurrent = formatContextMenuParentLabel(current);
  if (fromCurrent) {
    return fromCurrent;
  }
  const option = parentOptions.find((parent) => parent.key === current.key);
  return option ? formatContextMenuParentLabel(option) : '';
}

export function contextMenuParentMatchesQuery(parent: TaskParent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    formatContextMenuParentLabel(parent).toLowerCase().includes(q) ||
    (parent.key ?? '').toLowerCase().includes(q) ||
    (parent.display ?? '').toLowerCase().includes(q) ||
    (parent.id ?? '').toLowerCase().includes(q)
  );
}

export function hasLocalContextMenuParentMatch(
  parents: readonly TaskParent[],
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }
  return parents.some((parent) => contextMenuParentMatchesQuery(parent, trimmed));
}

export function taskParentFromIssueSearchItem(item: {
  key: string;
  summary: string;
}): TaskParent {
  const key = item.key.trim();
  const display = item.summary.trim() || key;
  return {
    display,
    id: key,
    key,
  };
}

