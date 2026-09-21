import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { BoardColumn } from '@/types/tracker';

import { getColumnStatusKey, normalizeStatusKeyForComparison } from './kanbanDndUtils';

export function buildKanbanColumnKeysNorm(column: BoardColumn): Set<string> {
  if (column.statusKeys?.length) {
    return new Set(column.statusKeys.map((k) => normalizeStatusKeyForComparison(k)));
  }
  return new Set(
    [
      normalizeStatusKeyForComparison(getColumnStatusKey(column) || ''),
      normalizeStatusKeyForComparison(column.id),
    ].filter(Boolean)
  );
}

export function findKanbanStatusTransition(
  transitionsForActive: TransitionItem[],
  columnKeysNorm: Set<string>
): TransitionItem | undefined {
  return transitionsForActive.find((t) => {
    const toKeyNorm = normalizeStatusKeyForComparison(t.to?.key || '');
    return toKeyNorm && columnKeysNorm.has(toKeyNorm);
  });
}
