/**
 * Превью DnD свимлейна: React state + ref для синхронных чтений в обработчиках dnd-kit.
 *
 * Перфоманс:
 * - ячейка под курсором живёт в `SwimlaneDragHoverStore`, а не в React state: движение
 *   курсора не перерисовывает планер, подписчики (превью слота, просрочка) читают её селектором;
 * - `beginDragSession` — один setState на старт вместо трёх.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SwimlaneDragHoverStore,
  type CellPosition,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

interface DragUiSnapshot {
  activeDraggableId: string | null;
  activeTaskId: string | null;
  isDraggingTask: boolean;
  isSidebarDropTarget: boolean;
  sidebarDropPointerY: number | null;
}

function emptyDragUi(): DragUiSnapshot {
  return {
    activeDraggableId: null,
    activeTaskId: null,
    isDraggingTask: false,
    isSidebarDropTarget: false,
    sidebarDropPointerY: null,
  };
}

export function useDragState(taskPositionsSize: number): {
  dragUi: DragUiSnapshot;
  dragStateApi: SwimlaneDragStateApi;
  hoverStore: SwimlaneDragHoverStore;
} {
  const snapshotRef = useRef<DragUiSnapshot>(emptyDragUi());
  const [dragUi, setDragUi] = useState<DragUiSnapshot>(() => emptyDragUi());
  const [hoverStore] = useState(() => new SwimlaneDragHoverStore());
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

  const resetDragState = useCallback(() => {
    hoverStore.reset();
    const next = emptyDragUi();
    snapshotRef.current = next;
    mousePositionRef.current = null;
    setDragUi(next);
  }, [hoverStore]);

  const beginDragSession = useCallback(
    (activeDraggableId: string, activeTaskId: string) => {
      hoverStore.reset();
      setDragUi((prev) => {
        const next: DragUiSnapshot = {
          ...prev,
          activeDraggableId,
          activeTaskId,
          isDraggingTask: true,
          isSidebarDropTarget: false,
          sidebarDropPointerY: null,
        };
        snapshotRef.current = next;
        return next;
      });
    },
    [hoverStore]
  );

  const setHoveredCell = useCallback(
    (cell: CellPosition | null) => {
      hoverStore.set(cell);
    },
    [hoverStore]
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
        return hoverStore.getLatest();
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
    [hoverStore, resetDragState, beginDragSession, setHoveredCell, setSidebarDropPreview],
  );

  useEffect(() => {
    const isEmpty = taskPositionsSize === 0;
    if (
      isEmpty &&
      !dragUi.isDraggingTask &&
      (dragUi.activeTaskId !== null || hoverStore.getLatest() !== null)
    ) {
      setTimeout(() => {
        resetDragState();
      }, 0);
    }
  }, [taskPositionsSize, dragUi.isDraggingTask, dragUi.activeTaskId, hoverStore, resetDragState]);

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

  useEffect(() => () => hoverStore.dispose(), [hoverStore]);

  return { dragUi, dragStateApi, hoverStore };
}
