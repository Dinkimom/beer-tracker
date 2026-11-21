import type { SwimlaneBoard } from '@/features/swimlane/SwimlaneBoardContext';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { Task, TaskPosition } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

/** Своё у слоя задач дорожки и переходное состояние; общее — `SwimlaneBoard` из контекста. */
export interface TaskLayerProps {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  currentCell: number;
  hasQuickAddDraftMode?: boolean;
  hasTaskOverlaps: boolean;
  /** Синхронизация с MobX: подсветка превью только во время активного drag */
  isDraggingTask?: boolean;
  layerHeight: number;
  linkingFromTaskId?: string | null;
  /** Дорожка, на которую агент предлагает поставить карточку. */
  planPatchAssigneeId?: string;
  planPatchSprintId?: number | null;
  planPatchTasksMap?: Map<string, Task>;
  positionedTasks: Array<{ task: Task; position: TaskPosition }>;
  segmentEditTaskId?: string | null;
  selectedTaskId?: string | null;
  /** Эффективный вертикальный layout заметок/фото (БД + MobX override). */
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  /** Высота зоны обычных карточек (без увеличения строки под фото). */
  taskBandTotalHeight: number;
  taskLayerMap: Map<string, number>;
  taskPositions: Map<string, TaskPosition>;
  /** Всего частей дня в таймлайне (рабочие дни × части дня) */
  timelineTotalParts: number;
  totalHeight: number;
  requestArrowRedraw: () => void;
}

/** Элемент слоя получает свои пропсы вместе с общим (`TaskLayer` объединяет их с контекстом). */
export type TaskLayerPositionedTaskItemProps = Omit<TaskLayerProps, 'positionedTasks'> & SwimlaneBoard & {
  position: TaskPosition;
  segmentEditDraftCells: boolean[] | null;
  setSegmentEditDraftCells: Dispatch<SetStateAction<boolean[] | null>>;
  task: Task;
};
