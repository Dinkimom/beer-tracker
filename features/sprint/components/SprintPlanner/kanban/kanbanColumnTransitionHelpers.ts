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

function transitionMatchesColumn(
  transition: TransitionItem,
  columnKeysNorm: Set<string>
): boolean {
  const toKeyNorm = normalizeStatusKeyForComparison(transition.to?.key || '');
  return Boolean(toKeyNorm && columnKeysNorm.has(toKeyNorm));
}

function transitionStatusRank(transition: TransitionItem, statusKeys: string[]): number {
  const needles = [transition.to?.id, transition.to?.key, transition.to?.display];
  let best = statusKeys.length;
  for (const needle of needles) {
    const needleNorm = normalizeStatusKeyForComparison(needle || '');
    if (!needleNorm) continue;
    const index = statusKeys.findIndex(
      (key) => normalizeStatusKeyForComparison(key) === needleNorm
    );
    if (index >= 0 && index < best) best = index;
  }
  return best;
}

function transitionStatusIdentity(transition: TransitionItem): string {
  return (
    transition.to?.id?.trim() ||
    normalizeStatusKeyForComparison(transition.to?.key || transition.id)
  );
}

/** Все переходы в статусы колонки, по порядку статусов на доске, без дублей одного статуса. */
export function listKanbanColumnTransitions(
  transitionsForActive: TransitionItem[],
  column: BoardColumn
): TransitionItem[] {
  const columnKeysNorm = buildKanbanColumnKeysNorm(column);
  if (!columnKeysNorm.size) return [];
  const statusKeys = column.statusKeys ?? [];
  const seen = new Set<string>();
  return transitionsForActive
    .filter((transition) => transitionMatchesColumn(transition, columnKeysNorm))
    .sort((a, b) => transitionStatusRank(a, statusKeys) - transitionStatusRank(b, statusKeys))
    .filter((transition) => {
      const identity = transitionStatusIdentity(transition);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}
