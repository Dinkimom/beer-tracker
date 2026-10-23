import type { MutableRefObject } from 'react';

/**
 * Ячейка свимлейна (исполнитель + день + часть дня).
 */
export interface CellPosition {
  assigneeId: string;
  day: number;
  /**
   * Ручная раскладка: ряд под карточкой; `k + 0.5` — нижняя половина ряда `k`
   * (если ряд занят, карточка встанет под соседом). Нет — при автосортировке.
   */
  layer?: number;
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
  /** Ручная раскладка (автосортировка выключена): ячейка несёт слой под карточкой. */
  manualLayers?: boolean;
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>;
  sidebarDropPointerY: number | null;
  /** Один setState на старт перетаскивания (вместо трёх отдельных сеттеров). */
  beginDragSession: (activeDraggableId: string, activeTaskId: string) => void;
  resetDragState: () => void;
  setHoveredCell: (cell: CellPosition | null) => void;
  setSidebarDropPreview: (preview: { active: boolean; pointerY: number | null }) => void;
}
