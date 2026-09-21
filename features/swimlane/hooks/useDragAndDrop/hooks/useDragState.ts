/**
 * Превью DnD свимлейна: React state + ref для синхронных чтений в обработчиках dnd-kit.
 *
 * Перфоманс:
 * - `setHoveredCell` не вызывает setState, если ячейка та же (`areCellPositionsEqual`);
 * - React-обновление hover батчится в rAF (как occupancy), snapshot обновляется сразу для drop;
 * - `beginDragSession` — один setState на старт вместо трёх.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  areCellPositionsEqual,
  type CellPosition,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

interface DragUiSnapshot {
  activeDraggableId: string | null;
  activeTaskId: string | null;
  hoveredCell: CellPosition | null;
  isDraggingTask: boolean;
  isSidebarDropTarget: boolean;
  sidebarDropPointerY: number | null;
}

function emptyDragUi(): DragUiSnapshot {
  return {
    activeDraggableId: null,
    activeTaskId: null,
    hoveredCell: null,
    isDraggingTask: false,
    isSidebarDropTarget: false,
    sidebarDropPointerY: null,
  };
}

export function useDragState(taskPositionsSize: number): {
  dragUi: DragUiSnapshot;
  dragStateApi: SwimlaneDragStateApi;
} {
  const snapshotRef = useRef<DragUiSnapshot>(emptyDragUi());
  const [dragUi, setDragUi] = useState<DragUiSnapshot>(() => emptyDragUi());
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingHoveredCellRef = useRef<CellPosition | null>(null);
  const hoveredCellRafRef = useRef<number | null>(null);

  const cancelPendingHoveredCellFrame = useCallback(() => {
    if (hoveredCellRafRef.current !== null) {
      cancelAnimationFrame(hoveredCellRafRef.current);
      hoveredCellRafRef.current = null;
    }
    pendingHoveredCellRef.current = null;
  }, []);

  const flushHoveredCellToReact = useCallback((cell: CellPosition | null) => {
    setDragUi((prev) => {
      if (areCellPositionsEqual(prev.hoveredCell, cell)) {
        return prev;
      }
      return { ...prev, hoveredCell: cell };
    });
  }, []);

  const resetDragState = useCallback(() => {
    cancelPendingHoveredCellFrame();
    const next = emptyDragUi();
    snapshotRef.current = next;
    mousePositionRef.current = null;
    setDragUi(next);
  }, [cancelPendingHoveredCellFrame]);

  const beginDragSession = useCallback(
    (activeDraggableId: string, activeTaskId: string) => {
      cancelPendingHoveredCellFrame();
      setDragUi((prev) => {
        const next: DragUiSnapshot = {
          ...prev,
          activeDraggableId,
          activeTaskId,
          isDraggingTask: true,
          hoveredCell: null,
          isSidebarDropTarget: false,
          sidebarDropPointerY: null,
        };
        snapshotRef.current = next;
        return next;
      });
    },
    [cancelPendingHoveredCellFrame]
  );

  const setHoveredCell = useCallback(
    (cell: CellPosition | null) => {
      if (areCellPositionsEqual(snapshotRef.current.hoveredCell, cell)) {
        return;
      }

      // Snapshot immediately so drag-end reads the latest cell even if React lags a frame.
      snapshotRef.current = { ...snapshotRef.current, hoveredCell: cell };

      if (cell === null) {
        cancelPendingHoveredCellFrame();
        flushHoveredCellToReact(null);
        return;
      }

      pendingHoveredCellRef.current = cell;
      if (hoveredCellRafRef.current !== null) {
        return;
      }
      hoveredCellRafRef.current = requestAnimationFrame(() => {
        hoveredCellRafRef.current = null;
        flushHoveredCellToReact(pendingHoveredCellRef.current);
        pendingHoveredCellRef.current = null;
      });
    },
    [cancelPendingHoveredCellFrame, flushHoveredCellToReact]
  );

  const setSidebarDropPreview = useCallback(
    (preview: { active: boolean; pointerY: number | null }) => {
      setDragUi((prev) => {
        if (
          prev.isSidebarDropTarget === preview.active &&
          prev.sidebarDropPointerY === preview.pointerY
        ) {
          return prev;
        }
        const next = {
          ...prev,
          isSidebarDropTarget: preview.active,
          sidebarDropPointerY: preview.active ? preview.pointerY : null,
        };
        snapshotRef.current = next;
        return next;
      });
    },
    []
  );

  const dragStateApi = useMemo<SwimlaneDragStateApi>(
    () => ({
      get activeDraggableId() {
        return snapshotRef.current.activeDraggableId;
      },
      get activeTaskId() {
        return snapshotRef.current.activeTaskId;
      },
      get hoveredCell() {
        return snapshotRef.current.hoveredCell;
      },
      get isDraggingTask() {
        return snapshotRef.current.isDraggingTask;
      },
      get isSidebarDropTarget() {
        return snapshotRef.current.isSidebarDropTarget;
      },
      get sidebarDropPointerY() {
        return snapshotRef.current.sidebarDropPointerY;
      },
      mousePositionRef,
      resetDragState,
      beginDragSession,
      setHoveredCell,
      setSidebarDropPreview,
    }),
    [resetDragState, beginDragSession, setHoveredCell, setSidebarDropPreview],
  );

  useEffect(() => {
    const isEmpty = taskPositionsSize === 0;
    if (isEmpty && !dragUi.isDraggingTask && (dragUi.activeTaskId !== null || dragUi.hoveredCell !== null)) {
      setTimeout(() => {
        resetDragState();
      }, 0);
    }
  }, [taskPositionsSize, dragUi.isDraggingTask, dragUi.activeTaskId, dragUi.hoveredCell, resetDragState]);

  useEffect(() => {
    if (!dragUi.isDraggingTask) {
      mousePositionRef.current = null;
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragUi.isDraggingTask]);

  useEffect(
    () => () => {
      cancelPendingHoveredCellFrame();
    },
    [cancelPendingHoveredCellFrame]
  );

  return { dragUi, dragStateApi };
}
