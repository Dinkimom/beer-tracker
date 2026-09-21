import type { MutableRefObject } from 'react';

/**
 * Ячейка свимлейна (исполнитель + день + часть дня).
 */
export interface CellPosition {
  assigneeId: string;
  day: number;
  part: number;
}

/**
 * Контекст сайдбара для дропа «в неназначенные» по координатам.
 */
export interface DragContextRef {
  current: {
    isDragFromSidebar: boolean;
    sidebarOpen: boolean;
    sidebarWidth: number;
    /** clientWidth окна на момент dragStart — для границы правого сайдбара */
    viewportWidth: number;
  } | null;
}

/**
 * Минимальный контракт состояния DnD (реализация — React `useDragState` в `useDragAndDrop`).
 */
export interface SwimlaneDragStateApi {
  activeDraggableId: string | null;
  activeTaskId: string | null;
  hoveredCell: CellPosition | null;
  isDraggingTask: boolean;
  isSidebarDropTarget: boolean;
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>;
  sidebarDropPointerY: number | null;
  /** Один setState на старт перетаскивания (вместо трёх отдельных сеттеров). */
  beginDragSession: (activeDraggableId: string, activeTaskId: string) => void;
  resetDragState: () => void;
  setHoveredCell: (cell: CellPosition | null) => void;
  setSidebarDropPreview: (preview: { active: boolean; pointerY: number | null }) => void;
}
