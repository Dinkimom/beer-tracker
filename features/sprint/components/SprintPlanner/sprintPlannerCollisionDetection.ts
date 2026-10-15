/**
 * Collision для внешнего DndContext планера.
 *
 * `closestCenter` по full-width `swimlane-*` даёт скачки между строками (центр полосы)
 * и на правом краю конкурирует с `sidebar-unassigned`. Для задач выбираем полосу по
 * pointer Y; сайдбар — только если ни одна полоса не содержит Y.
 */

import type {
  ClientRect,
  Collision,
  CollisionDetection,
  DroppableContainer,
  UniqueIdentifier,
} from '@dnd-kit/core';

import { closestCenter } from '@dnd-kit/core';

import { isActiveDeveloperRowDrag } from '@/features/swimlane/utils/swimlaneDragIds';

export const SIDEBAR_UNASSIGNED_DROPPABLE_ID = 'sidebar-unassigned';

function isSwimlaneDroppableId(id: UniqueIdentifier): boolean {
  return String(id).startsWith('swimlane-');
}

interface SwimlaneRectEntry {
  id: UniqueIdentifier;
  rect: Pick<ClientRect, 'bottom' | 'left' | 'right' | 'top'>;
}

/**
 * Полоса под курсором по Y (при нескольких — с X, иначе ближайшая midY).
 * Если ни одна не содержит Y — ближайшая по вертикали (зазор между строками).
 */
export function pickSwimlaneDroppableByPointer(input: {
  entries: readonly SwimlaneRectEntry[];
  pointerX: number;
  pointerY: number;
}): UniqueIdentifier | null {
  if (input.entries.length === 0) {
    return null;
  }

  const containingY = input.entries.filter(
    (entry) => input.pointerY >= entry.rect.top && input.pointerY <= entry.rect.bottom
  );
  if (containingY.length === 0) {
    return pickClosestSwimlaneByMidY(input.entries, input.pointerY);
  }
  const containingX = containingY.filter(
    (entry) => input.pointerX >= entry.rect.left && input.pointerX <= entry.rect.right
  );
  const pool = containingX.length > 0 ? containingX : containingY;

  return pickClosestSwimlaneByMidY(pool, input.pointerY);
}

function pickClosestSwimlaneByMidY(
  entries: readonly SwimlaneRectEntry[],
  pointerY: number
): UniqueIdentifier | null {
  if (entries.length === 0) {
    return null;
  }
  let bestId = entries[0]!.id;
  let bestDy = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const midY = (entry.rect.top + entry.rect.bottom) / 2;
    const dy = Math.abs(pointerY - midY);
    if (dy < bestDy) {
      bestDy = dy;
      bestId = entry.id;
    }
  }
  return bestId;
}

function collisionFor(
  id: UniqueIdentifier,
  droppableContainer: DroppableContainer,
  value: number
): Collision {
  return {
    id,
    data: {
      droppableContainer,
      value,
    },
  };
}

function collectSwimlaneAndSidebar(args: Parameters<CollisionDetection>[0]): {
  sidebarContainer: DroppableContainer | null;
  swimlaneEntries: Array<SwimlaneRectEntry & { container: DroppableContainer }>;
} {
  const swimlaneEntries: Array<SwimlaneRectEntry & { container: DroppableContainer }> = [];
  let sidebarContainer: DroppableContainer | null = null;

  for (const container of args.droppableContainers) {
    const rect = args.droppableRects.get(container.id);
    if (!rect) {
      continue;
    }
    const id = container.id;
    if (id === SIDEBAR_UNASSIGNED_DROPPABLE_ID) {
      sidebarContainer = container;
      continue;
    }
    if (isSwimlaneDroppableId(id)) {
      swimlaneEntries.push({ container, id, rect });
    }
  }

  return { sidebarContainer, swimlaneEntries };
}

function pointerIsInsideRect(
  pointerX: number,
  pointerY: number,
  rect: Pick<ClientRect, 'bottom' | 'left' | 'right' | 'top'>
): boolean {
  return (
    pointerX >= rect.left &&
    pointerX <= rect.right &&
    pointerY >= rect.top &&
    pointerY <= rect.bottom
  );
}

export const sprintPlannerCollisionDetection: CollisionDetection = (args) => {
  if (isActiveDeveloperRowDrag(args.active)) {
    return closestCenter(args);
  }

  const pointerX =
    args.pointerCoordinates?.x ?? args.collisionRect.left + args.collisionRect.width / 2;
  const pointerY =
    args.pointerCoordinates?.y ?? args.collisionRect.top + args.collisionRect.height / 2;

  const { sidebarContainer, swimlaneEntries } = collectSwimlaneAndSidebar(args);
  const underPointerY = swimlaneEntries.some(
    (entry) => pointerY >= entry.rect.top && pointerY <= entry.rect.bottom
  );

  if (underPointerY) {
    const pickedId = pickSwimlaneDroppableByPointer({
      entries: swimlaneEntries,
      pointerX,
      pointerY,
    });
    const entry = swimlaneEntries.find((item) => item.id === pickedId);
    if (entry) {
      return [collisionFor(pickedId!, entry.container, 0)];
    }
  }

  if (sidebarContainer) {
    const sidebarRect = args.droppableRects.get(SIDEBAR_UNASSIGNED_DROPPABLE_ID);
    if (sidebarRect && pointerIsInsideRect(pointerX, pointerY, sidebarRect)) {
      return [collisionFor(SIDEBAR_UNASSIGNED_DROPPABLE_ID, sidebarContainer, 0)];
    }
  }

  const fallbackId = pickSwimlaneDroppableByPointer({
    entries: swimlaneEntries,
    pointerX,
    pointerY,
  });
  const fallback = swimlaneEntries.find((item) => item.id === fallbackId);
  if (fallback) {
    return [collisionFor(fallbackId!, fallback.container, 0)];
  }

  return closestCenter(args);
};
