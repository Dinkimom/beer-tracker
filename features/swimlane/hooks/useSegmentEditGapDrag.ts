import { useCallback, useEffect, useRef, useState } from 'react';

import { moveSegmentGap, resizeSegmentGap } from '@/lib/planner-timeline';

/** До этого порога движение считается кликом (клик по разрыву — убрать его). */
const DRAG_THRESHOLD_PX = 3;

export type SegmentEditGapDragMode = 'move' | 'resize';

export interface SegmentEditGap {
  length: number;
  startIndex: number;
}

interface UseSegmentEditGapDragInput {
  cells: boolean[];
  maxLength: number;
  /** Ширина одной ячейки таймлайна в px на момент начала жеста. */
  getCellWidthPx: () => number;
  onCellsChange: (next: boolean[]) => void;
}

/** Сдвиг или смена длины разрыва на `delta` ячеек (drag и стрелки с клавиатуры). */
export function applySegmentEditGapChange(
  mode: SegmentEditGapDragMode,
  cells: boolean[],
  gap: SegmentEditGap,
  delta: number,
  maxLength: number
): boolean[] | null {
  return mode === 'move'
    ? moveSegmentGap(cells, gap.startIndex, delta)
    : resizeSegmentGap(cells, gap.startIndex, gap.length + delta, maxLength);
}

/**
 * Перетаскивание разрыва в редакторе отрезков: тело — сдвиг, правый край — длина.
 * Каждый шаг считается от снимка ячеек на pointerdown, поэтому откат курсора возвращает исходное.
 * Слушатели на `window`: кнопка разрыва может перемонтироваться, пока ячейки меняются.
 */
export function useSegmentEditGapDrag({
  cells,
  getCellWidthPx,
  maxLength,
  onCellsChange,
}: UseSegmentEditGapDragInput) {
  const [draggingGapOrdinal, setDraggingGapOrdinal] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => () => cleanupRef.current?.(), []);

  const startGapDrag = useCallback(
    (event: React.PointerEvent, gap: SegmentEditGap, ordinal: number, mode: SegmentEditGapDragMode) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      cleanupRef.current?.();

      const snapshot = cells;
      const startX = event.clientX;
      const cellWidth = getCellWidthPx();
      let moved = false;
      let lastDelta = 0;

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        if (!moved && Math.abs(dx) < DRAG_THRESHOLD_PX) {
          return;
        }
        if (!moved) {
          moved = true;
          setDraggingGapOrdinal(ordinal);
        }
        const delta = cellWidth > 0 ? Math.round(dx / cellWidth) : 0;
        if (delta === lastDelta) {
          return;
        }
        lastDelta = delta;
        onCellsChange(applySegmentEditGapChange(mode, snapshot, gap, delta, maxLength) ?? snapshot);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupRef.current = null;
      };

      function onEnd() {
        suppressClickRef.current = moved;
        cleanup();
        setDraggingGapOrdinal(null);
      }

      document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
      cleanupRef.current = cleanup;
    },
    [cells, getCellWidthPx, maxLength, onCellsChange]
  );

  /** `true`, если click пришёл сразу после перетаскивания и его надо проглотить. */
  const consumeDragClick = useCallback(() => {
    const suppressed = suppressClickRef.current;
    suppressClickRef.current = false;
    return suppressed;
  }, []);

  return { consumeDragClick, draggingGapOrdinal, startGapDrag };
}
