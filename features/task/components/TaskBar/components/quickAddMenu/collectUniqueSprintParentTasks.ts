import type { Task, TaskParent, TaskPosition } from '@/types';

import { humanFeatureDraftParentDisplay } from '@/features/swimlane/utils/featureDraftParentLabel';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

export function trimmedTaskParentToken(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function resolveParentKey(parent: TaskParent): string | null {
  const key = trimmedTaskParentToken(parent.key) || trimmedTaskParentToken(parent.id);
  return key || null;
}

/**
 * Уникальные родительские задачи (parent / epic) у задач текущего спринта.
 * Локальные драфты quick-add не учитываются, кроме родителя-черновика фичи.
 */
export function collectUniqueSprintParentTasks(tasks: readonly Task[]): TaskParent[] {
  const byKey = new Map<string, TaskParent>();

  for (const task of tasks) {
    const parentOrEpic = task.parent ?? task.epic;
    if (!parentOrEpic) {
      continue;
    }
    const key = resolveParentKey(parentOrEpic);
    if (!key || byKey.has(key)) {
      continue;
    }
    const isDraftParent = isFeatureLaneDraftRowId(key);
    if (task.isLocalTask === true && !isDraftParent) {
      continue;
    }
    const display = trimmedTaskParentToken(parentOrEpic.display);
    if (isDraftParent && !humanFeatureDraftParentDisplay(display, key)) {
      continue;
    }
    byKey.set(key, {
      display: display || key,
      id: trimmedTaskParentToken(parentOrEpic.id) || key,
      key,
      self: parentOrEpic.self,
    });
  }

  return sortQuickAddParentTasks([...byKey.values()]);
}

export function mergeQuickAddParentTasks(
  fromTasks: readonly TaskParent[],
  draftRows: readonly { id: string; name: string }[]
): TaskParent[] {
  const byKey = new Map(fromTasks.map((parent) => [parent.key, parent]));
  for (const row of draftRows) {
    const id = row.id.trim();
    const name = humanFeatureDraftParentDisplay(row.name, id);
    if (!id || !name || !isFeatureLaneDraftRowId(id)) {
      continue;
    }
    const existing = byKey.get(id);
    if (existing && humanFeatureDraftParentDisplay(existing.display, id)) {
      continue;
    }
    byKey.set(id, { display: name, id, key: id, self: existing?.self });
  }
  return sortQuickAddParentTasks([...byKey.values()]);
}

function sortQuickAddParentTasks(parents: TaskParent[]): TaskParent[] {
  return parents.sort((a, b) =>
    a.display.localeCompare(b.display, undefined, { sensitivity: 'base' })
  );
}

/** Ключи задач, которые уже стоят на доске и есть в спринте — их не предлагаем в «существующая». */
export function collectQuickAddExcludedIssueKeys(
  tasks: readonly Task[],
  taskPositions: Map<string, TaskPosition>
): Set<string> {
  const inSprint = new Set(
    tasks.filter((task) => task.isLocalTask !== true).map((task) => task.id)
  );
  const excluded = new Set<string>();
  for (const taskId of taskPositions.keys()) {
    if (taskId.startsWith('local-task-') || !inSprint.has(taskId)) {
      continue;
    }
    excluded.add(taskId);
  }
  return excluded;
}
