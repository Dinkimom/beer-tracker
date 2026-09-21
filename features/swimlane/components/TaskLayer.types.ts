import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Developer, PhaseSegment, Task, TaskPosition } from '@/types';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';

export interface TaskLayerProps {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
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
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  hoveredTaskId?: string | null;
  isDark: boolean;
  /** Синхронизация с MobX: подсветка превью только во время активного drag */
  isDraggingTask?: boolean;
  layerHeight: number;
  linkingFromTaskId?: string | null;
  linkSourceEndCell?: number | null;
  positionedTasks: Array<{ task: Task; position: TaskPosition }>;
  qaTasksMap?: Map<string, Task>;
  quickAddBoardId?: number | null;
  quickAddExcludedIssueKeys?: ReadonlySet<string>;
  quickAddParentSelectOptions?: CustomSelectOption<string>[];
  quickAddQueueOptions?: QuickAddQueueOption[];
  quickAddSubmittingTaskId?: string | null;
  segmentEditTaskId?: string | null;
  selectedSprintId?: number | null;
  selectedTaskId?: string | null;
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
  onCancelQuickAddDraft?: (taskId: string) => void;
  onCommentCardRowLayoutUpdate?: (
    commentId: string,
    layout: { layerShiftUp: number; span: number }
  ) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onPasteQuickAddNote?: (taskId: string) => void;
  onQuickAddDraftAssigneeChange?: (taskId: string, assigneeId: string) => void;
  onQuickAddDraftCommentColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onQuickAddDraftImageUrlChange?: (taskId: string, url: string | undefined) => void;
  onQuickAddDraftKindChange?: (taskId: string, kind: QuickAddDraftKind | undefined) => void;
  onQuickAddDraftParentChange?: (taskId: string, parentKey: string) => void;
  onQuickAddDraftQueueChange?: (taskId: string, queueKey: string) => void;
  onQuickAddDraftTitleChange?: (taskId: string, title: string) => void;
  onQuickAddDraftTypeChange?: (taskId: string, type: string) => void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onSelectExistingQuickAddDraft?: (taskId: string, task: Task) => void;
  onSubmitQuickAddCommentDraft?: (taskId: string, draftTitle?: string, color?: StickyNoteColor) => void;
  onSubmitQuickAddDiagramDraft?: (taskId: string, name?: string) => void;
  onSubmitQuickAddDraft?: (taskId: string, draftTitle?: string) => Promise<void> | void;
  onSubmitQuickAddImageDraft?: (taskId: string, caption: string, imageUrl: string) => void;
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
