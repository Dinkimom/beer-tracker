import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';
import type { Task, TaskPosition } from '@/types';

import { buildGroupedFlattenedRows } from './buildFlattenedRowsGroupedHelpers';
import {
  collectRelatedTaskIdsForAssigneeFilter,
  filterTasksByNameQuery,
  taskMatchesAssigneeFilter,
} from './buildFlattenedRowsHelpers';

export type FlattenedRow =
  | { type: 'parent'; id: string; display: string; key?: string }
  | { type: 'task'; task: Task; qaTask?: Task };

export function buildFlattenedRows(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
  globalNameFilter: string,
  selectedAssigneeIds?: Set<string>,
  customOrder?: OccupancyTaskOrder,
  /** Без строк-заголовков групп (эпик/стори/«без родителя») — плоский список задач */
  flatList?: boolean
): FlattenedRow[] {
  let filtered = filterTasksByNameQuery(tasks, globalNameFilter);

  const qaByOriginalId = new Map<string, Task>();
  filtered.forEach((t) => {
    if (t.originalTaskId) qaByOriginalId.set(t.originalTaskId, t);
  });

  if (selectedAssigneeIds && selectedAssigneeIds.size > 0) {
    const filteredByAssignee = filtered.filter((task) =>
      taskMatchesAssigneeFilter(task, taskPositions, selectedAssigneeIds)
    );

    const relatedTaskIds = collectRelatedTaskIdsForAssigneeFilter(filteredByAssignee, qaByOriginalId);
    filtered = filtered.filter((task) => relatedTaskIds.has(task.id));
    qaByOriginalId.clear();
    filtered.forEach((t) => {
      if (t.originalTaskId) qaByOriginalId.set(t.originalTaskId, t);
    });
  }

  const byParent = new Map<string | '__root__', Task[]>();
  filtered.forEach((t) => {
    const parentOrEpic = t.parent ?? t.epic;
    const key = parentOrEpic?.id ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  });

  const sortByKey = <T extends { id: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const sortByCustomOrder = <T extends { id: string }>(
    items: T[],
    order: string[] | undefined
  ): T[] => {
    const byId = new Map<string, T>();
    items.forEach((i) => byId.set(i.id, i));
    if (order?.length) {
      const orderSet = new Set(order);
      const ordered: T[] = [];
      order.forEach((id) => {
        const item = byId.get(id);
        if (item) ordered.push(item);
      });
      const rest = items.filter((item) => !orderSet.has(item.id));
      return [...ordered, ...sortByKey(rest)];
    }
    return sortByKey(items);
  };

  const pushTaskRows = (
    group: Task[],
    rows: FlattenedRow[],
    parentKey: string | '__root__'
  ) => {
    const devTasks = group.filter((t) => !t.originalTaskId);
    const devIds = new Set(devTasks.map((d) => d.id));
    const orphanQA = group.filter(
      (t) => t.originalTaskId && !devIds.has(t.originalTaskId)
    );
    const taskOrder = customOrder?.taskOrders?.[parentKey];
    const allTasksForOrder = [...devTasks, ...orphanQA];
    const sorted = sortByCustomOrder(allTasksForOrder, taskOrder);
    sorted.forEach((t) => {
      if (t.originalTaskId) {
        rows.push({ type: 'task', task: t });
      } else {
        rows.push({ type: 'task', task: t, qaTask: qaByOriginalId.get(t.id) });
      }
    });
  };

  return buildGroupedFlattenedRows({
    byParent,
    customOrder,
    filtered,
    flatList,
    pushTaskRows,
  });
}
