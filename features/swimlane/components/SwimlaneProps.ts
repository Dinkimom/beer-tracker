import type { TaskLayerProps } from './TaskLayer.types';
import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Developer, LayoutViewMode, Task, TaskParent, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

/** Обработчики, которые дорожка отдаёт слою задач как есть, — сигнатуры из `TaskLayerProps`. */
export interface SwimlaneProps
  extends Pick<
    TaskLayerProps,
    | 'onOverdueCloseAndCreate'
    | 'onSegmentEditCancel'
    | 'onSegmentEditSave'
    | 'onTaskClick'
    | 'onTaskHover'
    | 'onTaskResize'
  > {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  /** Доска (нужна для квартального плана отпусков) */
  boardId?: number | null;
  /**
   * Карточка, у которой hover дожил до тени.
   * Затемняет бары факта других задач и не трогает карточки.
   */
  cardShadowTaskId?: string | null;
  /** Действия с заметками — одним объектом (`SwimlaneCommentActions`). */
  commentActions?: SwimlaneCommentActions;
  commentCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developer: Developer;
  /** События доступности исполнителя (отпуск, больничный, дежурство) */
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
  hoveredTaskId?: string | null;
  isDraggingTask?: boolean;
  /** Строка закреплена под шапкой дат */
  isPinned?: boolean;
  /** Режим создания связи: id задачи-источника (null — режим выключен). */
  linkingFromTaskId?: string | null;
  participantsColumnWidth: number;
  qaTasksMap?: Map<string, Task>;
  /** Быстрое добавление — одним объектом (`QuickAddController`). */
  quickAdd?: QuickAddController;
  /** Редактирование отрезков (PhaseSegmentInlineEditor, как в занятости). */
  segmentEditTaskId?: string | null;
  selectedSprintId?: number | null;
  selectedTaskId?: string | null;
  /** Пользовательские стрелки видны. От этого зависит, уступает ли бейзлайн место связи. */
  showLinks?: boolean;
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
  onCloseSidebar?: () => void;
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
  onTogglePin?: (assigneeId: string) => void;
}
