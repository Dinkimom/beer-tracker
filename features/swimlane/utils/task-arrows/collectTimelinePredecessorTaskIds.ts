import type { TaskPosition } from '@/types';

import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

/**
 * Hover-кластер: карточка + все предшественники по таймлайну + прямые наследники (1 hop вперёд).
 * Рёбра earlier→later как наконечник стрелки.
 */
export function collectTimelineHoverLinkedTaskIds(
  startTaskId: string,
  links: ReadonlyArray<{ fromTaskId: string; toTaskId: string }>,
  taskPositions?: Map<string, TaskPosition>
): Set<string> {
  const predecessorsOf = new Map<string, string[]>();
  const directSuccessorsOf = new Map<string, string[]>();
  for (const link of links) {
    const { startTaskId: earlierTaskId, endTaskId: laterTaskId } = resolveLinkArrowDrawTaskIds(
      link.fromTaskId,
      link.toTaskId,
      taskPositions
    );
    pushNeighbor(predecessorsOf, laterTaskId, earlierTaskId);
    pushNeighbor(directSuccessorsOf, earlierTaskId, laterTaskId);
  }

  const connected = new Set<string>([startTaskId]);
  const stack = [startTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const predecessors = predecessorsOf.get(current);
    if (!predecessors) continue;
    for (const predecessor of predecessors) {
      if (connected.has(predecessor)) continue;
      connected.add(predecessor);
      stack.push(predecessor);
    }
  }

  const directSuccessors = directSuccessorsOf.get(startTaskId);
  if (directSuccessors) {
    for (const successor of directSuccessors) {
      connected.add(successor);
    }
  }

  return connected;
}

/** Стрелка в кластере hover: оба конца в множестве (включая hovered). */
export function isLinkInHoverConnectedComponent(
  hoverConnectedTaskIds: Set<string> | null,
  hoveredTaskId: string | null,
  link: { fromTaskId: string; toTaskId: string }
): boolean {
  if (hoveredTaskId == null || hoverConnectedTaskIds == null) return false;
  return (
    hoverConnectedTaskIds.has(link.fromTaskId) && hoverConnectedTaskIds.has(link.toTaskId)
  );
}

function pushNeighbor(
  adjacency: Map<string, string[]>,
  taskId: string,
  neighborId: string
): void {
  const list = adjacency.get(taskId);
  if (list) {
    list.push(neighborId);
    return;
  }
  adjacency.set(taskId, [neighborId]);
}
