'use client';

import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Developer, LayoutViewMode, PhaseSegment, Task, TaskParent, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';
import type { MouseEvent } from 'react';

import { createContext, useContext } from 'react';

/**
 * Общее для всех дорожек доски: конфигурация, данные и обработчики. Задаётся один раз
 * в `SwimlanesSectionLanes`; дорожке пропсами приходит только своё (сотрудник, задачи,
 * позиции, доступность) и переходное состояние (наведение, drag, контекстное меню).
 * Значение мемоизировано — меняется, только когда меняется что-то из полей.
 */
export interface SwimlaneBoard {
  /** Доска (нужна для квартального плана отпусков) */
  boardId: number | null;
  commentActions?: SwimlaneCommentActions;
  developers: Developer[];
  /** Не закрывать сайдбар кликом по дорожке. */
  disableCloseSidebarOnClick: boolean;
  /** Причины ошибок по taskId — для тултипа иконки ошибки на баре */
  errorReasons?: Map<string, OccupancyErrorReason[]>;
  /** ID задач, у которых фаза занятости участвует в ошибке планирования — подсветка и иконка на баре */
  errorTaskIds?: Set<string>;
  globalNameFilter?: string;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  participantsColumnWidth: number;
  qaTasksMap?: Map<string, Task>;
  quickAdd?: QuickAddController;
  selectedSprintId?: number | null;
  /** Пользовательские стрелки видны. От этого зависит, уступает ли бейзлайн место связи. */
  showLinks: boolean;
  sprintStartDate: Date;
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays: number;
  swimlaneFactChangelogsByTaskId?: Map<string, ChangelogEntry[]>;
  swimlaneFactCommentsByTaskId?: Map<string, IssueComment[]>;
  swimlaneFactDeveloperMap?: Map<string, Developer>;
  /** Пользовательские связи задач — для режима рисования стрелок. */
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  viewMode: LayoutViewMode;
  onCloseSidebar?: () => void;
  onContextMenu?: (e: MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onCreateTaskInCell?: (data: {
    assigneeId: string;
    day: number;
    imageFile?: File;
    parent?: TaskParent;
    part: number;
  }) => Promise<void> | void;
  onFactSegmentHover: (taskId: string | null) => void;
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
}

/**
 * Подсветка и приглушение карточек: наведение, связи, факт, контекстное меню. Меняется на каждое
 * наведение, поэтому отдельно от `SwimlaneBoard` и мимо пропсов дорожки: его читают только слой
 * карточек (`TaskLayer`) и полоса факта, дорожка с раскладкой на наведение не перерисовывается.
 */
export interface SwimlaneHighlight {
  /** Карточка, у которой hover дожил до тени: затемняет бары факта других задач. */
  cardShadowTaskId: string | null;
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null;
  /** Наведение на сегмент факта — затемнение карточек на всех строках. */
  factHoveredTaskId: string | null;
  /** Кластер связей при hover: несвязанные затемняются, если в кластере больше одной задачи. */
  hoverConnectedTaskIds: Set<string> | null;
  hoveredTaskId: string | null;
}

export const SwimlaneHighlightContext = createContext<SwimlaneHighlight | null>(null);

export function useSwimlaneHighlight(): SwimlaneHighlight {
  const highlight = useContext(SwimlaneHighlightContext);
  if (!highlight) {
    throw new Error('useSwimlaneHighlight must be used inside SwimlaneHighlightContext');
  }
  return highlight;
}

export const SwimlaneBoardContext = createContext<SwimlaneBoard | null>(null);

export function useSwimlaneBoard(): SwimlaneBoard {
  const board = useContext(SwimlaneBoardContext);
  if (!board) {
    throw new Error('useSwimlaneBoard must be used inside SwimlaneBoardContext');
  }
  return board;
}
