import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Comment, Developer, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

type SwimlaneLinkAnchor = 'bottom' | 'left' | 'right' | 'top';

export interface SwimlanesSectionProps {
  allTasksForDrag: Task[];
  /** События доступности участников доски (отпуск, техспринт и т.д.) */
  boardAvailabilityEvents?: BoardAvailabilityEvent[];
  boardId: number | null;
  comments: Comment[];
  commentsVisible: boolean;
  contextMenuBlurOtherCards?: boolean;
  developers: Developer[];
  developersManagement: {
    handleDragEnd: (activeId: string, overId: string) => void;
    hiddenIds: Set<string>;
    hideAllDevelopers: () => void;
    setSortBy: (sort: 'custom' | 'name' | 'sp' | 'tasks' | 'tp') => void;
    showAllDevelopers: () => void;
    sortBy: 'custom' | 'name' | 'sp' | 'tasks' | 'tp';
    sortedDevelopers: Developer[];
    toggleDeveloperVisibility: (id: string) => void;
    visibleDevelopers: Developer[];
  };
  dragAndDrop: {
    activeDraggableId: string | null;
    activeTaskDuration: number | null;
    activeTaskId: string | null;
    hoveredCell: { assigneeId: string; day: number; part: number } | null;
    isDraggingTask: boolean;
  };
  filteredTaskLinks: Array<{
    fromAnchor?: SwimlaneLinkAnchor;
    fromTaskId: string;
    id: string;
    toAnchor?: SwimlaneLinkAnchor;
    toTaskId: string;
  }>;
  /** Не дублировать строку «Общее»: в режиме «по фичам» она уже есть в списке строк. */
  hideTeamLane?: boolean;
  linksDimOnHover?: boolean;
  /**
   * Позиции для валидации пересечений исполнителей.
   * Если заданы — ошибки считаются по ним, а не по `taskPositions` (проекция на строки фич).
   */
  occupancyValidationPositions?: Map<string, TaskPosition>;
  participantsColumnWidth: number;
  qaTasksMap: Map<string, Task>;
  quickAddBoardId?: number | null;
  quickAddExcludedIssueKeys?: ReadonlySet<string>;
  quickAddParentSelectOptions?: CustomSelectOption<string>[];
  quickAddQueueOptions?: QuickAddQueueOption[];
  quickAddSubmittingTaskId?: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedSprintId: number | null;
  showLinks?: boolean;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sprintStartDate: Date;
  sprintTimelineWorkingDays?: number;
  /** Показывать дорожку занятости из CalDAV */
  swimlaneCalendarBusyEnabled?: boolean;
  /** Показывать под строкой свимлейна таймлайн факта только по статусу «В работе» */
  swimlaneFactTimelineEnabled?: boolean;
  /** Показывать фотокарточки на свимлейне */
  swimlaneImagesVisible?: boolean;
  /** Показывать текстовые заметки на свимлейне */
  swimlaneNotesVisible?: boolean;
  taskChangelogsByTaskId?: Map<string, ChangelogEntry[]>;
  /** Длительности по статусам из changelog (как в занятости) — для полосы факта «В работе» */
  taskDurationsByTaskId?: Map<string, StatusDuration[]>;
  taskIssueCommentsByTaskId?: Map<string, IssueComment[]>;
  taskPositions: Map<string, TaskPosition>;
  tasksByAssignee: Map<string, Task[]>;
  /** Карта всех задач доски — для расчёта статистики по тому, что лежит в свимлейне. */
  tasksMap: Map<string, Task>;
  viewMode: 'compact' | 'full';
  onAddLink?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
  onCancelQuickAddDraft?: (taskId: string) => void;
  onCloseSidebar: () => void;
  onCommentApprove?: (commentId: string) => void;
  onCommentCardRowLayoutUpdate?: (
    commentId: string,
    layout: { layerShiftUp: number; span: number }
  ) => void;
  onCommentCreate?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onCreateQATask: (devTaskId: string, anchorRect?: DOMRect) => void;
  onCreateTaskInCell?: (data: {
    assigneeId: string;
    day: number;
    imageFile?: File;
    parent?: TaskParent;
    part: number;
  }) => Promise<void> | void;
  onDeleteLink: (linkId: string) => void;
  onParticipantsColumnWidthChange?: (width: number) => void;
  onPasteQuickAddNote?: (taskId: string) => void;
  onQuickAddDraftAssigneeChange?: (taskId: string, assigneeId: string) => void;
  onQuickAddDraftCommentColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onQuickAddDraftImageUrlChange?: (taskId: string, url: string | undefined) => void;
  onQuickAddDraftKindChange?: (taskId: string, kind: QuickAddDraftKind | undefined) => void;
  onQuickAddDraftParentChange?: (taskId: string, parentKey: string) => void;
  onQuickAddDraftQueueChange?: (taskId: string, queueKey: string) => void;
  onQuickAddDraftTitleChange?: (taskId: string, title: string) => void;
  onQuickAddDraftTypeChange?: (taskId: string, type: string) => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onSelectExistingQuickAddDraft?: (taskId: string, task: Task) => void;
  onSubmitQuickAddCommentDraft?: (taskId: string, draftTitle?: string) => void;
  onSubmitQuickAddDiagramDraft?: (taskId: string, name?: string) => void;
  onSubmitQuickAddDraft?: (taskId: string, draftTitle?: string) => Promise<void> | void;
  onSubmitQuickAddImageDraft?: (taskId: string, caption: string, imageUrl: string) => void;
  onTaskClick: (taskId: string) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  removeParticipantFromTeam?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
  setTasks?: (updater: (prev: Task[]) => Task[]) => void;
}
