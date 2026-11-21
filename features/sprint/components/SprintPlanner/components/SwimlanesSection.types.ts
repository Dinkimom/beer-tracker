import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { Comment, Developer, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

type SwimlaneLinkAnchor = 'bottom' | 'left' | 'right' | 'top';

/**
 * Транзитом до `SwimlaneBoardContext` (`useSwimlaneBoardValue`): секция и дорожки их не читают.
 * Хук разбирает срез по полям, поэтому объект можно собирать на каждый рендер.
 */
interface SwimlaneBoardInputs {
  /** Действия с заметками — одним объектом (`SwimlaneCommentActions`). */
  commentActions?: SwimlaneCommentActions;
  /** Быстрое добавление — одним объектом (`QuickAddController`). */
  quickAdd?: QuickAddController;
  selectedSprintId: number | null;
  taskChangelogsByTaskId?: Map<string, ChangelogEntry[]>;
  taskIssueCommentsByTaskId?: Map<string, IssueComment[]>;
  onCloseSidebar: () => void;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onCreateQATask: (devTaskId: string, anchorRect?: DOMRect) => void;
  onCreateTaskInCell?: (data: {
    assigneeId: string;
    day: number;
    imageFile?: File;
    parent?: TaskParent;
    part: number;
  }) => Promise<void> | void;
  onOverdueCloseAndCreate?: (args: {
    currentCell: number;
    position: TaskPosition;
    task: Task;
    timelineTotalParts: number;
  }) => Promise<void> | void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
}

/** Что показывать на доске — из локальных настроек планера. */
interface SwimlaneDisplaySettings {
  /** Заметки или фото видны (хотя бы один слой аннотаций). */
  commentsVisible: boolean;
  /** Полоса факта «в работе» под карточками. */
  factTimelineEnabled: boolean;
  imagesVisible: boolean;
  /** Наведение приглушает карточки вне кластера связей. */
  linksDimOnHover: boolean;
  /** Пользовательские стрелки связей. */
  linksVisible: boolean;
  notesVisible: boolean;
}

export interface SwimlanesSectionProps {
  allTasksForDrag: Task[];
  board: SwimlaneBoardInputs;
  /** События доступности участников доски (отпуск, больничный, дежурство) */
  boardAvailabilityEvents?: BoardAvailabilityEvent[];
  boardId: number | null;
  comments: Comment[];
  developers: Developer[];
  developersManagement: DevelopersManagement;
  display: SwimlaneDisplaySettings;
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
  /**
   * Позиции для валидации пересечений исполнителей.
   * Если заданы — ошибки считаются по ним, а не по `taskPositions` (проекция на строки фич).
   */
  occupancyValidationPositions?: Map<string, TaskPosition>;
  participantsColumnWidth: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  sidebarOpen: boolean;
  sprintStartDate: Date;
  sprintTimelineWorkingDays?: number;
  /** Длительности по статусам из changelog (как в занятости) — для полосы факта «В работе» */
  taskDurationsByTaskId?: Map<string, StatusDuration[]>;
  taskPositions: Map<string, TaskPosition>;
  tasksByAssignee: Map<string, Task[]>;
  /** Карта всех задач доски — для расчёта статистики по тому, что лежит в свимлейне. */
  tasksMap: Map<string, Task>;
  viewMode: 'compact' | 'full';
  onAddLink?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
  onDeleteLink: (linkId: string) => void;
  onParticipantsColumnWidthChange?: (width: number) => void;
  onTaskClick: (taskId: string) => void;
  removeParticipantFromTeam?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
  /** Режим по фичам правит родителя локальной задачи. */
  setTasks?: (updater: (prev: Task[]) => Task[]) => void;
}
