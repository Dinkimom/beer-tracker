/**
 * Превью DnD свимлейна: React state + ref для синхронных чтений в обработчиках dnd-kit.
 *
 * Перфоманс:
 * - ячейка под курсором живёт в `SwimlaneDragHoverStore`, а не в React state: движение
 *   курсора не перерисовывает планер, подписчики (превью слота, просрочка) читают её селектором;
 * - Y над сайдбаром — в `SwimlaneSidebarDropPointerStore` (тот же контракт); в React только
 *   boolean `isSidebarDropTarget`;
 * - `beginDragSession` — один setState на старт вместо трёх.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SwimlaneDragHoverStore,
  SwimlaneSidebarDropPointerStore,
  type CellPosition,
  type SwimlaneDragStateApi,
} from '@/lib/layers/application/swimlaneDrag';

interface DragUiSnapshot {
  activeDraggableId: string | null;
  activeTaskId: string | null;
  isDraggingTask: boolean;
  isSidebarDropTarget: boolean;
}

function emptyDragUi(): DragUiSnapshot {
  return {
    activeDraggableId: null,
    activeTaskId: null,
    isDraggingTask: false,
    isSidebarDropTarget: false,
  };
}

export function useDragState(taskPositionsSize: number): {
  dragUi: DragUiSnapshot;
  dragStateApi: SwimlaneDragStateApi;
  hoverStore: SwimlaneDragHoverStore;
  sidebarDropPointerStore: SwimlaneSidebarDropPointerStore;
} {
  const snapshotRef = useRef<DragUiSnapshot>(emptyDragUi());
  const [dragUi, setDragUi] = useState<DragUiSnapshot>(() => emptyDragUi());
  const [hoverStore] = useState(() => new SwimlaneDragHoverStore());
  const [sidebarDropPointerStore] = useState(() => new SwimlaneSidebarDropPointerStore());
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

  const resetDragState = useCallback(() => {
    hoverStore.reset();
    sidebarDropPointerStore.reset();
    const next = emptyDragUi();
    snapshotRef.current = next;
    mousePositionRef.current = null;
    setDragUi(next);
  }, [hoverStore, sidebarDropPointerStore]);

  const beginDragSession = useCallback(
    (activeDraggableId: string, activeTaskId: string) => {
      hoverStore.reset();
      sidebarDropPointerStore.reset();
      setDragUi((prev) => {
        const next: DragUiSnapshot = {
          ...prev,
          activeDraggableId,
          activeTaskId,
          isDraggingTask: true,
          isSidebarDropTarget: false,
        };
        snapshotRef.current = next;
        return next;
      });
    },
    [hoverStore, sidebarDropPointerStore]
  );

  const setHoveredCell = useCallback(
    (cell: CellPosition | null) => {
      hoverStore.set(cell);
    },
    [hoverStore]
  );

  const setSidebarDropPreview = useCallback(
    (preview: { active: boolean; pointerY: number | null }) => {
      sidebarDropPointerStore.set(preview.active ? preview.pointerY : null);
      if (snapshotRef.current.isSidebarDropTarget === preview.active) {
        return;
      }
      setDragUi((prev) => {
        const next = {
          ...prev,
          isSidebarDropTarget: preview.active,
        };
        snapshotRef.current = next;
        return next;
      });
    },
    [sidebarDropPointerStore]
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
        return sidebarDropPointerStore.getLatest();
      },
      mousePositionRef,
      resetDragState,
      beginDragSession,
      setHoveredCell,
      setSidebarDropPreview,
    }),
    [
      hoverStore,
      sidebarDropPointerStore,
      resetDragState,
      beginDragSession,
      setHoveredCell,
      setSidebarDropPreview,
    ]
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
      if (snapshotRef.current.isSidebarDropTarget) {
        sidebarDropPointerStore.set(e.clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragUi.isDraggingTask, sidebarDropPointerStore]);

  useEffect(
    () => () => {
      hoverStore.dispose();
      sidebarDropPointerStore.dispose();
    },
    [hoverStore, sidebarDropPointerStore]
  );

  return { dragUi, dragStateApi, hoverStore, sidebarDropPointerStore };
}
