import type { SprintInfo } from './OccupancyTableHeader';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { Task, TaskPosition } from '@/types';
import type { Developer } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { PARTS_PER_DAY } from '@/constants';
import { getWeekColumnTimelineRange } from '@/features/quarterly-planning-v2/utils/issueCommentsWeekColumn';
import { isCellOccupiedByTask } from '@/features/sprint/utils/occupancyUtils';
import { getPartStatus } from '@/utils/dateUtils';

export function getDevPhaseEndCell(
  position: TaskPosition | undefined,
  cellsPerDay: 1 | 3
): number {
  if (!position) return 0;
  if (cellsPerDay === 1) {
    return position.startDay + Math.max(1, Math.ceil(position.duration / PARTS_PER_DAY));
  }
  return position.startDay * PARTS_PER_DAY + position.startPart + position.duration;
}

export function resolveOccupancyTimelineTargetTask({
  cellIndex,
  devPhaseEndCell,
  position,
  qaPosition,
  qaTask,
  task,
}: {
  cellIndex: number;
  devPhaseEndCell: number;
  position?: TaskPosition;
  qaPosition?: TaskPosition;
  qaTask?: Task | null;
  task: Task;
}): Task | null {
  if (!position) return task;
  if (qaTask && !qaPosition && cellIndex >= devPhaseEndCell) return qaTask;
  return null;
}

export function occupancyTimelineCellClasses(partStatus: ReturnType<typeof getPartStatus>): {
  cellColor: string;
  cellGhostHoverReset: string;
} {
  if (partStatus === 'current') {
    return {
      cellColor: 'bg-blue-100/70 dark:bg-blue-900/30',
      cellGhostHoverReset: 'hover:!bg-blue-100/70 dark:hover:!bg-blue-900/30',
    };
  }
  return {
    cellColor: '',
    cellGhostHoverReset: 'hover:!bg-transparent dark:hover:!bg-transparent',
  };
}

export function resolveOccupancyWeekTimelineRange(input: {
  dayIndex: number;
  issueCommentsInWeekCell: IssueComment[];
  showWeekIssueComments: boolean;
  sprintInfos: SprintInfo[] | undefined;
  sprintStartDate: Date;
  timelineTotalParts: number | undefined;
  weekColumns: QuarterlyWeekColumn[];
}): ReturnType<typeof getWeekColumnTimelineRange> | null {
  const {
    showWeekIssueComments,
    issueCommentsInWeekCell,
    dayIndex,
    weekColumns,
    sprintInfos,
    sprintStartDate,
    timelineTotalParts,
  } = input;
  if (!showWeekIssueComments || issueCommentsInWeekCell.length === 0) return null;
  return getWeekColumnTimelineRange(
    dayIndex,
    weekColumns,
    sprintInfos ?? [],
    sprintStartDate,
    timelineTotalParts ?? 0
  );
}

export function resolveOccupancyCellTitle(input: {
  assignee?: Developer;
  occupied: boolean;
  occupiedByDev: boolean;
  qaAssignee?: Developer;
  qaTask?: Task | null;
  task: Task;
  t: (key: string, values?: Record<string, string>) => string;
}): string {
  const { occupied, occupiedByDev, task, assignee, qaTask, qaAssignee, t } = input;
  if (!occupied) {
    return t('sprintPlanner.occupancy.emptyCellHint');
  }
  if (occupiedByDev) {
    return t('sprintPlanner.occupancy.cellTaskWithAssignee', {
      taskName: task.name,
      assigneeName: assignee?.name ?? t('task.grouping.unassigned'),
    });
  }
  if (!qaTask) return '';
  return t('sprintPlanner.occupancy.cellTaskWithAssignee', {
    taskName: qaTask.name,
    assigneeName: qaAssignee?.name ?? t('task.grouping.unassigned'),
  });
}

export function isOccupancyTimelineCellOccupied(
  dayIndex: number,
  partIndex: number,
  position: TaskPosition | undefined,
  qaPosition: TaskPosition | undefined,
  cellsPerDay: 1 | 3
): { occupied: boolean; occupiedByDev: boolean; occupiedByQA: boolean } {
  const occupiedByDev = Boolean(
    position && isCellOccupiedByTask(dayIndex, partIndex, position, cellsPerDay)
  );
  const occupiedByQA = Boolean(
    qaPosition && isCellOccupiedByTask(dayIndex, partIndex, qaPosition, cellsPerDay)
  );
  return {
    occupiedByDev,
    occupiedByQA,
    occupied: occupiedByDev || occupiedByQA,
  };
}
