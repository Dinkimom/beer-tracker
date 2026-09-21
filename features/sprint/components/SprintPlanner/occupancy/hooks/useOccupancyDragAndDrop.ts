import type { FlattenedRow } from '../utils/buildFlattenedRows';
import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';
import type { DragEndEvent } from '@dnd-kit/core';

import { useCallback, useMemo } from 'react';

import { parseOccupancyDragIds } from './useOccupancyDragEndHelpers';
import { applyOccupancyDragReorder } from './useOccupancyDragReorderHelpers';

export function useOccupancyDragAndDrop({
  visibleRows,
  onTaskOrderChange,
}: {
  visibleRows: FlattenedRow[];
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
}) {
  const getRowId = useCallback((row: FlattenedRow): string => {
    if (row.type === 'parent') return `parent:${row.id}`;
    return `task:${row.task.id}`;
  }, []);

  const sortableRowIds = useMemo(() => {
    return visibleRows.map(getRowId);
  }, [visibleRows, getRowId]);

  const handleOccupancyDragEnd = useCallback(
    (event: DragEndEvent) => {
      const parsed = parseOccupancyDragIds(event);
      if (!parsed || !onTaskOrderChange) return;

      applyOccupancyDragReorder({
        ...parsed,
        onTaskOrderChange,
        visibleRows,
      });
    },
    [visibleRows, onTaskOrderChange]
  );

  return {
    getRowId,
    sortableRowIds,
    handleOccupancyDragEnd,
  };
}
