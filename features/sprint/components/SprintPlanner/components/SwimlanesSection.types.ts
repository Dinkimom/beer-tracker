import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { Comment, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
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

/** Сетка дней спринта и события доступности людей на ней. */
interface SwimlaneTimeline {
  /** События доступности участников доски (отпуск, больничный, дежурство) */
  boardAvailabilityEvents?: BoardAvailabilityEvent[];
  sprintStartDate: Date;
  sprintTimelineWorkingDays?: number;
}

/** Стрелки связей на доске и действия с ними. */
interface SwimlaneLinks {
  items: Array<{
    fromAnchor?: SwimlaneLinkAnchor;
    fromTaskId: string;
    id: string;
    toAnchor?: SwimlaneLinkAnchor;
    toTaskId: string;
  }>;
  onAdd?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
  onDelete: (linkId: string) => void;
}

/** Колонка участников слева: ширина и её перетаскивание. */
interface ParticipantsColumn {
  width: number;
  onWidthChange?: (width: number) => void;
}

export interface SwimlanesSectionProps {
  allTasksForDrag: Task[];
  board: SwimlaneBoardInputs;
  boardId: number | null;
  comments: Comment[];
  developersManagement: DevelopersManagement;
  display: SwimlaneDisplaySettings;
  dragAndDrop: {
    activeDraggableId: string | null;
    activeTaskDuration: number | null;
    activeTaskId: string | null;
    isDraggingTask: boolean;
  };
  /** Не дублировать строку «Общее»: в режиме «по фичам» она уже есть в списке строк. */
  hideTeamLane?: boolean;
  links: SwimlaneLinks;
  /**
   * Позиции для валидации пересечений исполнителей.
   * Если заданы — ошибки считаются по ним, а не по `taskPositions` (проекция на строки фич).
   */
  occupancyValidationPositions?: Map<string, TaskPosition>;
  participantsColumn: ParticipantsColumn;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Длительности по статусам из changelog (как в занятости) — для полосы факта «В работе» */
  taskDurationsByTaskId?: Map<string, StatusDuration[]>;
  taskPositions: Map<string, TaskPosition>;
  tasksByAssignee: Map<string, Task[]>;
  /** Карта всех задач доски — для расчёта статистики по тому, что лежит в свимлейне. */
  tasksMap: Map<string, Task>;
  timeline: SwimlaneTimeline;
  viewMode: 'compact' | 'full';
  removeParticipantFromTeam?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
}
