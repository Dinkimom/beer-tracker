import type { FlattenedRow } from './buildFlattenedRows';
import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';
import type { Task, TaskParent } from '@/types';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';

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

function resolveParentIssueKey(parent?: TaskParent): string | undefined {
  const k = parent?.key?.trim();
  if (k) return k;
  return resolveIssueKeyFromSelf(parent?.self);
}

export function buildGroupedFlattenedRows(input: {
  byParent: Map<string | '__root__', Task[]>;
  customOrder?: OccupancyTaskOrder;
  filtered: Task[];
  flatList?: boolean;
  pushTaskRows: (group: Task[], rows: FlattenedRow[], parentKey: string | '__root__') => void;
}): FlattenedRow[] {
  if (input.flatList) {
    const rows: FlattenedRow[] = [];
    input.pushTaskRows(input.filtered, rows, '__root__');
    return rows;
  }

  const rows: FlattenedRow[] = [];
  const naturalParentIds = [
    ...new Set(
      input.filtered
        .map((t) => (t.parent ?? t.epic)?.id)
        .filter((id): id is string => !!id)
    ),
  ];
  const naturalParentIdSet = new Set(naturalParentIds);
  const orderParentIdSet = input.customOrder?.parentIds?.length
    ? new Set(input.customOrder.parentIds)
    : null;
  const parentIds =
    orderParentIdSet && orderParentIdSet.size > 0
      ? [
          ...input.customOrder!.parentIds!.filter((id) => naturalParentIdSet.has(id)),
          ...naturalParentIds.filter((id) => !orderParentIdSet.has(id)),
        ]
      : naturalParentIds;

  parentIds.forEach((pid) => {
    const group = input.byParent.get(pid) ?? [];
    if (group.length === 0) return;
    const parent = group[0].parent ?? group[0].epic;
    const display = parent?.display ?? pid;
    const parentKey = resolveParentIssueKey(parent);
    rows.push({ type: 'parent', id: pid, display, key: parentKey });
    input.pushTaskRows(group, rows, pid);
  });

  const roots = input.byParent.get('__root__') ?? [];
  if (roots.length > 0) {
    rows.push({ type: 'parent', id: '__root__', display: TASK_GROUP_KEY_NO_PARENT });
    input.pushTaskRows(roots, rows, '__root__');
  }

  return rows;
}
