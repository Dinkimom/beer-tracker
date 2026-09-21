import type { SprintInfo } from './OccupancyTableHeader';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { Developer, Task, TaskPosition } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { getPartStatus } from '@/utils/dateUtils';

import {
  getDevPhaseEndCell,
  isOccupancyTimelineCellOccupied,
  occupancyTimelineCellClasses,
  resolveOccupancyTimelineTargetTask,
  resolveOccupancyWeekTimelineRange,
} from './occupancyTimelineCellsHelpers';

export function buildOccupancyTimelinePartCellState(input: {
  assignee?: Developer;
  cellsPerDay: 1 | 3;
  dayIndex: number;
  issueCommentsByWeek: Map<number, IssueComment[]>;
  partIndex: number;
  position?: TaskPosition;
  qaAssignee?: Developer;
  qaPosition?: TaskPosition;
  qaTask?: Task | null;
  showWeekIssueComments: boolean;
  sprintInfos: SprintInfo[] | undefined;
  sprintStartDate: Date;
  task: Task;
  timelineTotalParts: number | undefined;
  weekColumns: QuarterlyWeekColumn[];
  workingDays: number;
}) {
  const {
    dayIndex,
    partIndex,
    position,
    qaPosition,
    cellsPerDay,
    sprintStartDate,
    workingDays,
    task,
    qaTask,
    showWeekIssueComments,
    issueCommentsByWeek,
    weekColumns,
    sprintInfos,
    timelineTotalParts,
  } = input;

  const { occupied, occupiedByDev, occupiedByQA } = isOccupancyTimelineCellOccupied(
    dayIndex,
    partIndex,
    position,
    qaPosition,
    cellsPerDay
  );
  const partStatus = getPartStatus(dayIndex, partIndex, sprintStartDate, workingDays);
  const isEmpty = !occupied;
  const cellIndex = dayIndex * cellsPerDay + partIndex;
  const devPhaseEndCell = getDevPhaseEndCell(position, cellsPerDay);
  const targetTask = resolveOccupancyTimelineTargetTask({
    cellIndex,
    devPhaseEndCell,
    position,
    qaPosition,
    qaTask,
    task,
  });
  const { cellColor, cellGhostHoverReset } = occupancyTimelineCellClasses(partStatus);
  const issueCommentsInWeekCell = showWeekIssueComments
    ? (issueCommentsByWeek.get(dayIndex) ?? [])
    : [];
  const weekTimelineRange = resolveOccupancyWeekTimelineRange({
    dayIndex,
    issueCommentsInWeekCell,
    showWeekIssueComments,
    sprintInfos,
    sprintStartDate,
    timelineTotalParts,
    weekColumns,
  });

  return {
    cellColor,
    cellGhostHoverReset,
    cellIndex,
    isEmpty,
    issueCommentsInWeekCell,
    occupied,
    occupiedByDev,
    occupiedByQA,
    partStatus,
    targetTask,
    weekTimelineRange,
  };
}
