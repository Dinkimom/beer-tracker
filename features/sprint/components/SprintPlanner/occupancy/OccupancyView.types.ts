import type { SprintInfo, TimelineSettings } from './components/table/OccupancyTableHeader';
import type { OccupancyRowFieldsVisibility, OccupancyTimelineScale } from '@/hooks/useLocalStorage';
import type { OccupancyTaskOrder } from '@/lib/beerTrackerApi';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, Task, TaskPosition } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';
import type { ChecklistItem } from '@/types/tracker';
import type { MouseEvent } from 'react';

export type { SprintInfo };

/** Раскладка колонок, сайдбара и режимов отображения таймлайна. */
interface OccupancyViewLayoutConfig {
  cellsPerDay?: 1 | 3;
  /** Колонки по неделям (квартальное планирование v2) */
  displayAsWeeks?: boolean;
  /** Плоский список задач без группировки по родителю */
  flatTaskList?: boolean;
  legacyCompactLayout?: boolean;
  plannerSidebarOpen?: boolean;
  plannerSidebarWidth?: number;
  quarterlyPhaseStyle?: boolean;
  /** Две колонки задач (название + статус) — только квартальный планировщик v2 */
  quarterlySplitTaskColumns?: boolean;
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  timelineScale?: OccupancyTimelineScale;
  twoLineDayHeader?: boolean;
}

/** Колбэки взаимодействия с таблицей занятости. */
interface OccupancyViewCallbacks {
  onAddLink?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
  onContextMenu?: (e: MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => void;
  onCreateTaskForParent?: (row: { display: string; id: string; key?: string }) => void;
  onDeleteLink?: (linkId: string) => void;
  onOpenAssigneePicker?: (data: {
    anchorRect: DOMRect;
    position: TaskPosition;
    task: Task;
    taskName: string;
  }) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (
    position: TaskPosition,
    segments: Array<{ duration: number; startDay: number; startPart: number }>,
    isQa: boolean
  ) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
}

export interface OccupancyViewProps {
  availability?: QuarterlyAvailability | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  deliveryChecklistItems?: ChecklistItem[];
  developers: Developer[];
  discoveryChecklistItems?: ChecklistItem[];
  factVisible: boolean;
  /**
   * Батч GitLab fact по ссылкам MR (спринт-планер грузит один раз на все задачи).
   * Если не передан — OccupancyView загружает сам по tasks с MR.
   */
  gitlabFactByLink?: Record<string, GitLabMergeRequestFact>;
  globalNameFilter?: string;
  linksDimOnHover?: boolean;
  occupancyCallbacks?: OccupancyViewCallbacks;
  occupancyLayout?: OccupancyViewLayoutConfig;
  segmentEditTaskId?: string | null;
  selectedAssigneeIds?: Set<string>;
  sprintInfos?: SprintInfo[];
  sprintStartDate: Date;
  /** Число рабочих колонок для одного спринта; если задан sprintInfos — не используется. */
  sprintWorkingDaysCount?: number;
  swimlaneLinksVisible?: boolean;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  taskOrder?: OccupancyTaskOrder;

  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  timelineSettings: TimelineSettings;
  /**
   * true — фильтр по имени, меню и сегменты из {@link SprintPlannerUiStore}
   * (основной планер). false/не задано — только пропсы (эпики и внешние встраивания).
   */
  usePlannerUiStore?: boolean;
}
