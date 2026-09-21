import type { OccupancyTaskOrder } from './types';
import type { Task } from '@/types';

function sortByTaskKey(items: Task[]): Task[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function sortTasksInGroup(items: Task[], idsOrder: string[] | undefined): Task[] {
  const byId = new Map<string, Task>();
  items.forEach((i) => byId.set(i.id, i));
  if (idsOrder?.length) {
    const orderSet = new Set(idsOrder);
    const ordered: Task[] = [];
    idsOrder.forEach((id) => {
      const item = byId.get(id);
      if (item) ordered.push(item);
    });
    const rest = items.filter((item) => !orderSet.has(item.id));
    return [...ordered, ...sortByTaskKey(rest)];
  }
  return sortByTaskKey(items);
}

export function resolveOccupancyParentIds(
  tasks: Task[],
  byParent: Map<string | '__root__', Task[]>,
  order: OccupancyTaskOrder | null
): string[] {
  const naturalParentIds = [...new Set(tasks.filter((t) => t.parent).map((t) => t.parent!.id))];
  const hasUserOrder = order?.parentIds?.length || (order?.taskOrders && Object.keys(order.taskOrders).length > 0);
  if (hasUserOrder && order?.parentIds?.length) {
    return [
      ...order.parentIds.filter((id) => byParent.has(id)),
      ...naturalParentIds.filter((id) => !order.parentIds!.includes(id)),
    ];
  }
  return naturalParentIds;
}

export function appendOccupancySortedGroups(
  result: Task[],
  parentIds: string[],
  byParent: Map<string | '__root__', Task[]>,
  order: OccupancyTaskOrder | null
): void {
  appendNonRootOccupancyGroups(result, parentIds, byParent, order);
  appendRootOccupancyGroup(result, byParent, order);
}

function appendNonRootOccupancyGroups(
  result: Task[],
  parentIds: string[],
  byParent: Map<string | '__root__', Task[]>,
  order: OccupancyTaskOrder | null
): void {
  for (const pid of parentIds) {
    if (pid === '__root__') continue;
    const group = byParent.get(pid) ?? [];
    if (group.length === 0) continue;
    result.push(...sortTasksInGroup(group, order?.taskOrders?.[pid]));
  }
}

function appendRootOccupancyGroup(
  result: Task[],
  byParent: Map<string | '__root__', Task[]>,
  order: OccupancyTaskOrder | null
): void {
  const roots = byParent.get('__root__') ?? [];
  if (roots.length === 0) return;
  result.push(...sortTasksInGroup(roots, order?.taskOrders?.['__root__']));
}
