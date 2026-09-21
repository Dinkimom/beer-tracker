import type { FlattenedRow } from '../utils/buildFlattenedRows';
import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';
import type { DragEndEvent } from '@dnd-kit/core';

export function buildOccupancyOrderFromVisibleRows(visibleRows: FlattenedRow[]): OccupancyTaskOrder {
  const currentParentIds = visibleRows
    .filter((r): r is Extract<typeof r, { type: 'parent' }> => r.type === 'parent')
    .map((r) => r.id);
  const currentTaskOrders: Record<string, string[]> = {};
  let currentParent: string | '__root__' = '__root__';
  visibleRows.forEach((r) => {
    if (r.type === 'parent') {
      currentParent = r.id;
      currentTaskOrders[currentParent] = [];
      return;
    }
    const order = currentTaskOrders[currentParent] ?? [];
    currentTaskOrders[currentParent] = order;
    order.push(r.task.id);
  });
  return { parentIds: currentParentIds, taskOrders: currentTaskOrders };
}

export function parseOccupancyDragIds(event: DragEndEvent): {
  activeId: string;
  activeIsParent: boolean;
  overId: string;
  overIsParent: boolean;
} | null {
  const { active, over } = event;
  if (!over || active.id === over.id) return null;
  const activeStr = String(active.id);
  const overStr = String(over.id);
  return {
    activeIsParent: activeStr.startsWith('parent:'),
    overIsParent: overStr.startsWith('parent:'),
    activeId: activeStr.startsWith('parent:') ? activeStr.slice(7) : activeStr.slice(5),
    overId: overStr.startsWith('parent:') ? overStr.slice(7) : overStr.slice(5),
  };
}

export function reorderParentIds(
  parentIds: string[],
  activeId: string,
  overId: string
): string[] | null {
  const idxA = parentIds.indexOf(activeId);
  const idxB = parentIds.indexOf(overId);
  if (idxA === -1 || idxB === -1) return null;
  const next = [...parentIds];
  const [moved] = next.splice(idxA, 1);
  next.splice(idxB, 0, moved);
  return next;
}

export function parentIdForTask(visibleRows: FlattenedRow[], taskId: string): string | '__root__' {
  let parent: string | '__root__' = '__root__';
  for (const row of visibleRows) {
    if (row.type === 'parent') parent = row.id;
    else if (row.task.id === taskId) return parent;
  }
  return parent;
}
