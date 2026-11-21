import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { Comment, Developer, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

type SwimlaneLinkAnchor = 'bottom' | 'left' | 'right' | 'top';

export interface SwimlanesSectionProps {
  allTasksForDrag: Task[];
  /** События доступности участников доски (отпуск, больничный, дежурство) */
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
  /** Быстрое добавление — одним объектом (`QuickAddController`). */
  quickAdd?: QuickAddController;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedSprintId: number | null;
  showLinks?: boolean;
  sidebarOpen: boolean;
  sprintStartDate: Date;
  sprintTimelineWorkingDays?: number;
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
  onOverdueCloseAndCreate?: (args: {
    currentCell: number;
    position: TaskPosition;
    task: Task;
    timelineTotalParts: number;
  }) => Promise<void> | void;
  onParticipantsColumnWidthChange?: (width: number) => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onTaskClick: (taskId: string) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  removeParticipantFromTeam?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
  setTasks?: (updater: (prev: Task[]) => Task[]) => void;
}
