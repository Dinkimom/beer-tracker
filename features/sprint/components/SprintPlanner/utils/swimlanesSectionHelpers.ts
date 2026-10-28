import type { Task, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { collectTimelineHoverLinkedTaskIds } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';

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

interface TaskLinkLike {
  fromTaskId: string;
  toTaskId: string;
}

/**
 * Hover-кластер: все предшественники по таймлайну + один hop вперёд (кого блокирует; + QA).
 */
export function computeHoverConnectedTaskIds(
  hoveredTaskId: string | null,
  filteredTaskLinks: TaskLinkLike[],
  qaTasksMap: Map<string, Task> | undefined,
  taskPositions: Map<string, TaskPosition> | undefined
): Set<string> | null {
  if (!hoveredTaskId) return null;
  const links = appendSyntheticQaLinks(filteredTaskLinks, qaTasksMap, taskPositions);
  return collectTimelineHoverLinkedTaskIds(hoveredTaskId, links, taskPositions);
}

function appendSyntheticQaLinks(
  filteredTaskLinks: TaskLinkLike[],
  qaTasksMap: Map<string, Task> | undefined,
  taskPositions: Map<string, TaskPosition> | undefined
): TaskLinkLike[] {
  if (!qaTasksMap || !taskPositions) {
    return filteredTaskLinks;
  }
  const links = [...filteredTaskLinks];
  for (const [devTaskId, qaTask] of qaTasksMap) {
    if (!taskPositions.has(devTaskId) || !taskPositions.has(qaTask.id)) continue;
    links.push({ fromTaskId: devTaskId, toTaskId: qaTask.id });
  }
  return links;
}

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

/** Смещение sticky-строки под шапкой планера. Строки остаются в одном родителе и не размонтируются. */
export function pinnedSwimlaneFrameTop(offsetPx: number): string {
  if (offsetPx <= 0) return 'var(--planner-controls-h, 0px)';
  return `calc(var(--planner-controls-h, 0px) + ${offsetPx}px)`;
}

export function applyPinnedSwimlaneFrameTops(frames: readonly HTMLElement[]): void {
  let offset = 0;
  for (const frame of frames) {
    const top = pinnedSwimlaneFrameTop(offset);
    if (frame.style.top !== top) frame.style.top = top;
    offset += frame.offsetHeight;
  }
}

/** Сбрасывает top у остальных кадров и выставляет стек закреплённых. Возвращает закреплённые кадры. */
export function syncPinnedSwimlaneFrames(
  framesById: ReadonlyMap<string, HTMLElement>,
  pinnedIds: readonly string[]
): HTMLElement[] {
  const pinnedSet = new Set(pinnedIds);
  const pinnedFrames: HTMLElement[] = [];
  for (const id of pinnedIds) {
    const frame = framesById.get(id);
    if (frame) pinnedFrames.push(frame);
  }
  for (const [id, frame] of framesById) {
    if (!pinnedSet.has(id)) frame.style.top = '';
  }
  applyPinnedSwimlaneFrameTops(pinnedFrames);
  return pinnedFrames;
}
