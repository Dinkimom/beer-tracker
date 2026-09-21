'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { computeSidebarDropInsertIndex } from '@/features/sidebar/utils/computeSidebarDropInsertIndex';

function resolveSidebarDropInsertIndex(
  layoutGeneration: number,
  visibleTaskIds: string[],
  rowElementsRef: RefObject<Map<string, HTMLElement>>,
  pointerY: number
): number | null {
  if (layoutGeneration < 0) {
    return null;
  }
  return computeSidebarDropInsertIndex(
    visibleTaskIds,
    (taskId) => rowElementsRef.current.get(taskId)?.getBoundingClientRect(),
    pointerY
  );
}

interface UseSidebarDropInsertIndexParams {
  activeTaskId: string | null | undefined;
  isDropTarget: boolean;
  orderedTaskIds: string[];
  pointerY: number | null | undefined;
}

export function useSidebarDropInsertIndex({
  isDropTarget,
  pointerY,
  orderedTaskIds,
  activeTaskId,
}: UseSidebarDropInsertIndexParams): {
  insertIndex: number | null;
  registerTaskRowRef: (taskId: string, element: HTMLElement | null) => void;
  slotHeightPx: number | null;
} {
  const rowElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [measureGeneration, setMeasureGeneration] = useState(0);
  const [slotHeightPx, setSlotHeightPx] = useState<number | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const registerTaskRowRef = useCallback((taskId: string, element: HTMLElement | null) => {
    if (element) {
      rowElementsRef.current.set(taskId, element);
      const height = element.offsetHeight;
      if (height > 0) {
        setSlotHeightPx((prev) => (prev === height ? prev : height));
      }
    } else {
      rowElementsRef.current.delete(taskId);
    }
  }, []);

  const visibleTaskIds = useMemo(() => {
    if (!isDropTarget || !activeTaskId) {
      return orderedTaskIds;
    }
    return orderedTaskIds.filter((id) => id !== activeTaskId);
  }, [orderedTaskIds, isDropTarget, activeTaskId]);

  useLayoutEffect(() => {
    if (!isDropTarget || pointerY == null) {
      queueMicrotask(() => setInsertIndex(null));
      return;
    }
    const frame = requestAnimationFrame(() => {
      setMeasureGeneration((n) => n + 1);
    });
    return () => cancelAnimationFrame(frame);
  }, [isDropTarget, pointerY, visibleTaskIds]);

  useLayoutEffect(() => {
    if (!isDropTarget || pointerY == null) {
      queueMicrotask(() => setInsertIndex(null));
      return;
    }
    const next = resolveSidebarDropInsertIndex(
      measureGeneration,
      visibleTaskIds,
      rowElementsRef,
      pointerY
    );
    queueMicrotask(() => setInsertIndex(next));
  }, [isDropTarget, pointerY, visibleTaskIds, measureGeneration]);

  return { insertIndex, registerTaskRowRef, slotHeightPx };
}
