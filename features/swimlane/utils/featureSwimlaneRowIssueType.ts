import type { Task, TaskParent } from '@/types';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

type FeatureLaneParentSource = 'epic' | 'parent';

function isFeatureLaneSharedRowIdForType(rowId: string): boolean {
  return isTeamSwimlaneAssigneeId(rowId) || rowId === TASK_GROUP_KEY_NO_PARENT;
}

export function isFeatureLaneDraftParent(parent: Pick<TaskParent, 'id'> | null | undefined): boolean {
  return parent != null && isFeatureLaneDraftRowId(parent.id);
}

export function resolveFeatureLaneRowIssueType(input: {
  parent: TaskParent | null;
  parentSource?: FeatureLaneParentSource;
  rowId: string;
  trackerTypes?: ReadonlyMap<string, string>;
}): string | null {
  if (isFeatureLaneSharedRowIdForType(input.rowId)) {
    return null;
  }
  if (isFeatureLaneDraftRowId(input.rowId) || isFeatureLaneDraftParent(input.parent)) {
    return 'draft';
  }
  const parentKey = input.parent?.key?.trim();
  const parentId = input.parent?.id?.trim();
  const rowId = input.rowId.trim();
  const trackerType =
    (parentKey ? input.trackerTypes?.get(parentKey) : undefined) ??
    (parentId ? input.trackerTypes?.get(parentId) : undefined) ??
    (rowId ? input.trackerTypes?.get(rowId) : undefined);
  if (trackerType) {
    return trackerType;
  }
  if (input.parentSource === 'epic') {
    return 'epic';
  }
  if (input.parentSource === 'parent') {
    return 'story';
  }
  return null;
}

/**
 * Снимок типов из API + типы задач спринта (в т.ч. только что созданных стори/эпиков),
 * чтобы иконка типа появилась до появления записи в issue_snapshots.
 */
export function mergeFeatureLaneTrackerTypes(
  fromSnapshots: ReadonlyMap<string, string> | undefined,
  tasks: readonly Pick<Task, 'id' | 'type'>[]
): Map<string, string> {
  const next = new Map(fromSnapshots ?? []);
  for (const task of tasks) {
    const id = task.id.trim();
    const type = task.type?.trim();
    if (!id || !type || next.has(id)) {
      continue;
    }
    next.set(id, type);
  }
  return next;
}
