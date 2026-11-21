import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Developer, PhaseSegment, Task, TaskPosition } from '@/types';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';

export interface TaskLayerProps {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  /** Действия с заметками — одним объектом (`SwimlaneCommentActions`). */
  commentActions?: SwimlaneCommentActions;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId: string | null;
  currentCell: number;
  developers: Developer[];
  errorReasons?: Map<string, OccupancyErrorReason[]>;
  errorTaskIds?: Set<string>;
  factHoveredTaskId?: string | null;
  globalNameFilter?: string;
  hasQuickAddDraftMode?: boolean;
  hasTaskOverlaps: boolean;
  hoverConnectedTaskIds?: Set<string> | null;
  hoveredTaskId?: string | null;
  /** Синхронизация с MobX: подсветка превью только во время активного drag */
  isDraggingTask?: boolean;
  layerHeight: number;
  linkingFromTaskId?: string | null;
  /** Дорожка, на которую агент предлагает поставить карточку. */
  planPatchAssigneeId?: string;
  planPatchSprintId?: number | null;
  planPatchTasksMap?: Map<string, Task>;
  positionedTasks: Array<{ task: Task; position: TaskPosition }>;
  qaTasksMap?: Map<string, Task>;
  /** Быстрое добавление — одним объектом (`QuickAddController`). */
  quickAdd?: QuickAddController;
  segmentEditTaskId?: string | null;
  selectedSprintId?: number | null;
  selectedTaskId?: string | null;
  /** Пользовательские стрелки на доске. false — бейзлайн не уступает им место. */
  showLinks?: boolean;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  /** Эффективный вертикальный layout заметок/фото (БД + MobX override). */
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  /** Высота зоны обычных карточек (без увеличения строки под фото). */
  taskBandTotalHeight: number;
  taskLayerMap: Map<string, number>;
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  /** Всего частей дня в таймлайне (рабочие дни × части дня) */
  timelineTotalParts: number;
  totalHeight: number;
  onContextMenu?: (e: MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onOverdueCloseAndCreate?: (args: {
    currentCell: number;
    position: TaskPosition;
    task: Task;
    timelineTotalParts: number;
  }) => Promise<void> | void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskHover?: (taskId: string | null) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  requestArrowRedraw: () => void;
}

export type TaskLayerPositionedTaskItemProps = Omit<TaskLayerProps, 'positionedTasks'> & {
  position: TaskPosition;
  segmentEditDraftCells: boolean[] | null;
  setSegmentEditDraftCells: Dispatch<SetStateAction<boolean[] | null>>;
  task: Task;
};
