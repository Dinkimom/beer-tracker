import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { computeHoverConnectedTaskIds } from './swimlanesSectionHoverHelpers';

interface DeveloperAvailabilityRow {
  boardEvents: BoardAvailabilityEvent[];
}

export function buildDeveloperAvailabilityMap(
  boardEvents: BoardAvailabilityEvent[] | null | undefined,
  developers: Array<{ id: string }>
): Map<string, DeveloperAvailabilityRow> {
  const empty = new Map<string, DeveloperAvailabilityRow>();
  if (!boardEvents?.length) return empty;

  const map = new Map<string, DeveloperAvailabilityRow>();
  for (const dev of developers) {
    const eventsForDev = boardEvents.filter((e) => e.memberId === dev.id);
    if (eventsForDev.length > 0) {
      map.set(dev.id, { boardEvents: eventsForDev });
    }
  }
  return map;
}

export { computeHoverConnectedTaskIds };

export function partitionPinnedSwimlaneRows<T extends { id: string }>(
  rows: readonly T[],
  pinnedIds: readonly string[]
): { pinned: T[]; unpinned: T[] } {
  const pinnedSet = new Set(pinnedIds);
  const pinned: T[] = [];
  const unpinned: T[] = [];
  for (const row of rows) {
    if (pinnedSet.has(row.id)) {
      pinned.push(row);
    } else {
      unpinned.push(row);
    }
  }
  return { pinned, unpinned };
}

export function togglePinnedSwimlaneRowId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
