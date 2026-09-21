import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';
import type { Task } from '@/types';

export type { SwimlaneNoteClipboard };

/** Чем плюс на ячейке занимается, пока выбран инструмент капсулы. `cursor` / `link` — без плюса. */
export type SwimlanePlacementTool =
  | 'availability'
  | 'comment'
  | 'cursor'
  | 'diagram'
  | 'image'
  | 'link'
  | 'task';

/** Сериализуемый rect для якорения контекстного меню у карточки задачи */
export interface SprintPlannerContextMenuAnchorRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface SprintPlannerContextMenuState {
  /** DOM id `.task-bar-item`, чтобы меню следовало за анимацией ширины карточки */
  anchorElementId?: string;
  anchorRect?: SprintPlannerContextMenuAnchorRect;
  /** false — меню из кнопки ⋯ в строке занятости: без затемнения карточек/фаз и без синей обводки фазы */
  dimPeerUi?: boolean;
  hideRemoveFromPlan?: boolean;
  isBacklogTask?: boolean;
  position: { x: number; y: number };
  task: Task;
}

/** Инлайн-редактирование заметки или попап конвертации в задачу. */
export interface SprintPlannerNoteComposerState {
  mode: 'comment' | 'new';
  taskId: string;
}

/** Живой предпросмотр стикера, пока открыто инлайн-редактирование (до Save). */
export interface SprintPlannerNoteEditPreview {
  color?: StickyNoteColor;
  taskId: string;
  text?: string;
}

/** Превью горизонтального ресайза карточки до mouseup (пересчёт слоёв свимлейна). */
export interface SprintPlannerTaskResizePreview {
  duration: number;
  startCell: number | null;
  taskId: string;
}

/** Превью бара занятости для presence (локальный drag/resize). */
export interface SprintPlannerOccupancyPresencePreview {
  duration: number;
  startDay: number;
  startPart: number;
  taskId: string;
}
