import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Comment, Developer, LayoutViewMode, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

export interface SwimlaneProps {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  /** Доска (нужна для квартального плана отпусков) */
  boardId?: number | null;
  /** Занятость из CalDAV за диапазон спринта */
  calendarBusySegments?: CalendarBusySegment[];
  /** Показывать дорожку занятости календаря */
  calendarBusyVisible?: boolean;
  commentCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developer: Developer;
  /** События доступности исполнителя (отпуск, техспринт, больничный, дежурство) */
  developerAvailability?: { boardEvents: BoardAvailabilityEvent[] };
  developers: Developer[];
  // Отключить закрытие сайдбара при клике на свимлейн (полезно для спринт планера)
  disableCloseSidebarOnClick?: boolean;
  /** Причины ошибок по taskId — для тултипа иконки ошибки на баре */
  errorReasons?: Map<string, OccupancyErrorReason[]>;
  /** ID задач, у которых фаза занятости участвует в ошибке планирования — подсветка и иконка на баре */
  errorTaskIds?: Set<string>;
  /** Наведение на сегмент факта (общее состояние секции свимлейнов) — затемнение карточек на всех строках */
  factHoveredTaskId: string | null;
  globalNameFilter?: string;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  /** Кластер связей при hover. Несвязанные затемняются (opacity 0.5), если в кластере больше одной задачи. */
  hoverConnectedTaskIds?: Set<string> | null;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  hoveredTaskId?: string | null;
  isDraggingTask?: boolean;
  /** Строка закреплена под шапкой дат */
  isPinned?: boolean;
  /** Режим создания связи: id задачи-источника (null — режим выключен). */
  linkingFromTaskId?: string | null;
  /** Конец плана источника (ячейка), для правила «цель не раньше источника». */
  linkSourceEndCell?: number | null;
  participantsColumnWidth: number;
  qaTasksMap?: Map<string, Task>;
  quickAddBoardId?: number | null;
  quickAddExcludedIssueKeys?: ReadonlySet<string>;
  quickAddParentSelectOptions?: CustomSelectOption<string>[];
  quickAddQueueOptions?: QuickAddQueueOption[];
  quickAddSubmittingTaskId?: string | null;
  /** Редактирование отрезков (PhaseSegmentInlineEditor, как в занятости). */
  segmentEditTaskId?: string | null;
  selectedSprintId?: number | null;
  selectedTaskId?: string | null;
  sidebarOpen?: boolean;
  sidebarWidth?: number;
  sprintStartDate: Date;
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays?: number;
  swimlaneFactChangelogsByTaskId?: Map<string, ChangelogEntry[]>;
  swimlaneFactCommentsByTaskId?: Map<string, IssueComment[]>;
  swimlaneFactDeveloperMap?: Map<string, Developer>;
  /** Показывать полосу факта «В работе» под карточками (как в занятости) */
  swimlaneFactTimelineEnabled?: boolean;
  /** Фазы факта по changelog (зависят от типа задачи): отдельные полосы, при пересечении — разные дорожки */
  swimlaneInProgressDurations?: SwimlaneInProgressFactSegment[];
  /** Пользовательские связи задач — для режима рисования стрелок. */
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  /** Список задач исполнителя. В рендере не используется (данные из taskPositions/tasksMap), нужен только для сравнения в React.memo. */
  tasks: Task[];
  /** Карта всех задач доски: по ней в свимлейне считаются только задачи, лежащие на строке (по taskPositions). */
  tasksMap: Map<string, Task>;
  viewMode?: LayoutViewMode;
  onCancelQuickAddDraft?: (taskId: string) => void;
  onCloseSidebar?: () => void;
  onCommentApprove?: (commentId: string) => void;
  onCommentCardRowLayoutUpdate?: (
    commentId: string,
    layout: { layerShiftUp: number; span: number }
  ) => void;
  onCommentCreate?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onCreateTaskInCell?: (data: {
    assigneeId: string;
    day: number;
    imageFile?: File;
    parent?: TaskParent;
    part: number;
  }) => Promise<void> | void;
  onFactSegmentHover: (taskId: string | null) => void;
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
  onSubmitQuickAddCommentDraft?: (taskId: string, draftTitle?: string) => void;
  onSubmitQuickAddDiagramDraft?: (taskId: string, name?: string) => void;
  onSubmitQuickAddDraft?: (taskId: string, draftTitle?: string) => Promise<void> | void;
  onSubmitQuickAddImageDraft?: (taskId: string, caption: string, imageUrl: string) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskHover?: (taskId: string | null) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  onTogglePin?: (assigneeId: string) => void;
}
