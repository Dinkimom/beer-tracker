import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { Developer, Task, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

/**
 * Своё у дорожки (сотрудник, его задачи и позиции, доступность, факт) и переходное состояние доски.
 * Общее для всех дорожек — конфигурация, данные и обработчики — в `SwimlaneBoardContext`.
 */
export interface SwimlaneProps {
  activeDraggableId?: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  /**
   * Карточка, у которой hover дожил до тени.
   * Затемняет бары факта других задач и не трогает карточки.
   */
  cardShadowTaskId?: string | null;
  commentCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developer: Developer;
  /** События доступности исполнителя (отпуск, больничный, дежурство) */
  developerAvailability?: { boardEvents: BoardAvailabilityEvent[] };
  /** Наведение на сегмент факта (общее состояние секции свимлейнов) — затемнение карточек на всех строках */
  factHoveredTaskId: string | null;
  /** Кластер связей при hover. Несвязанные затемняются (opacity 0.5), если в кластере больше одной задачи. */
  hoverConnectedTaskIds?: Set<string> | null;
  hoveredTaskId?: string | null;
  isDraggingTask?: boolean;
  /** Строка закреплена под шапкой дат */
  isPinned?: boolean;
  /** Режим создания связи: id задачи-источника (null — режим выключен). */
  linkingFromTaskId?: string | null;
  /** Редактирование отрезков (PhaseSegmentInlineEditor, как в занятости). */
  segmentEditTaskId?: string | null;
  selectedTaskId?: string | null;
  /** Показывать полосу факта «В работе» под карточками (на дорожке команды — нет). */
  swimlaneFactTimelineEnabled?: boolean;
  /** Фазы факта по changelog (зависят от типа задачи): отдельные полосы, при пересечении — разные дорожки */
  swimlaneInProgressDurations?: SwimlaneInProgressFactSegment[];
  taskPositions: Map<string, TaskPosition>;
  /** Задачи дорожки. В рендере не используется (данные из taskPositions/tasksMap), нужен для сравнения в React.memo. */
  tasks: Task[];
  /** Карта задач доски с заметками дорожки: по ней считаются только задачи, лежащие на строке. */
  tasksMap: Map<string, Task>;
  onTogglePin?: (assigneeId: string) => void;
}
