import type { FlattenedRow } from '../utils/buildFlattenedRows';
import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';

import {
  buildOccupancyOrderFromVisibleRows,
  parentIdForTask,
  reorderParentIds,
} from './useOccupancyDragEndHelpers';

function applyOccupancyParentDragReorder(
  baseOrder: OccupancyTaskOrder,
  activeId: string,
  overId: string,
  onTaskOrderChange: (order: OccupancyTaskOrder) => void
): void {
  const next = reorderParentIds(baseOrder.parentIds, activeId, overId);
  if (!next) return;
  onTaskOrderChange({ ...baseOrder, parentIds: next });
}

function applyOccupancyTaskDragReorder(
  baseOrder: OccupancyTaskOrder,
  visibleRows: FlattenedRow[],
  activeId: string,
  overId: string,
  onTaskOrderChange: (order: OccupancyTaskOrder) => void
): void {
  const pActive = parentIdForTask(visibleRows, activeId);
  const pOver = parentIdForTask(visibleRows, overId);
  if (pActive !== pOver) return;
  const order = baseOrder.taskOrders[pActive] ?? [];
  const nextOrder = reorderParentIds(order, activeId, overId);
  if (!nextOrder) return;
  onTaskOrderChange({
    ...baseOrder,
    taskOrders: { ...baseOrder.taskOrders, [pActive]: nextOrder },
  });
}

export function applyOccupancyDragReorder(input: {
  activeId: string;
  activeIsParent: boolean;
  onTaskOrderChange: (order: OccupancyTaskOrder) => void;
  overId: string;
  overIsParent: boolean;
  visibleRows: FlattenedRow[];
}): void {
  const baseOrder = buildOccupancyOrderFromVisibleRows(input.visibleRows);

  if (input.activeIsParent && input.overIsParent) {
    applyOccupancyParentDragReorder(baseOrder, input.activeId, input.overId, input.onTaskOrderChange);
    return;
  }

  if (input.activeIsParent || input.overIsParent) return;

  applyOccupancyTaskDragReorder(
    baseOrder,
    input.visibleRows,
    input.activeId,
    input.overId,
    input.onTaskOrderChange
  );
}
