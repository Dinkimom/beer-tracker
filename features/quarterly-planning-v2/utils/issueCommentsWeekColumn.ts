import type { QuarterlySprintInfo } from '../types';
import type { IssueComment } from '@/types/tracker';

import { WORKING_DAYS_PER_WEEK } from '@/constants';
import { dateTimeToFractionalCellInRange } from '@/lib/planner-timeline/sprintCellUtils';

import {
  type QuarterlyWeekColumn,
} from './quarterlyTimelineHeader';

function getWeekColumnEndDate(
  weekIndex: number,
  weekColumns: QuarterlyWeekColumn[],
  sprintInfos: QuarterlySprintInfo[]
): Date {
  if (weekIndex + 1 < weekColumns.length) {
    const end = new Date(weekColumns[weekIndex + 1].startDate);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return end;
  }
  const col = weekColumns[weekIndex];
  const sprint = sprintInfos.find((s) => s.id === col.sprintId);
  if (sprint?.endDate) {
    const end = new Date(sprint.endDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  const end = new Date(col.startDate);
  end.setDate(end.getDate() + WORKING_DAYS_PER_WEEK);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function findWeekIndexForDate(
  date: Date,
  weekColumns: QuarterlyWeekColumn[],
  sprintInfos: QuarterlySprintInfo[]
): number | null {
  const ts = date.getTime();
  for (let i = 0; i < weekColumns.length; i++) {
    const start = new Date(weekColumns[i].startDate);
    start.setHours(0, 0, 0, 0);
    const end = getWeekColumnEndDate(i, weekColumns, sprintInfos);
    if (ts >= start.getTime() && ts <= end.getTime()) return i;
  }
  return null;
}

export function groupIssueCommentsByWeekColumn(
  comments: IssueComment[],
  weekColumns: QuarterlyWeekColumn[],
  sprintInfos: QuarterlySprintInfo[]
): Map<number, IssueComment[]> {
  const map = new Map<number, IssueComment[]>();
  for (const comment of comments) {
    const weekIndex = findWeekIndexForDate(new Date(comment.createdAt), weekColumns, sprintInfos);
    if (weekIndex == null) continue;
    const list = map.get(weekIndex) ?? [];
    list.push(comment);
    map.set(weekIndex, list);
  }
  return map;
}

export function getWeekColumnTimelineRange(
  weekIndex: number,
  weekColumns: QuarterlyWeekColumn[],
  sprintInfos: QuarterlySprintInfo[],
  sprintStartDate: Date,
  totalParts: number
): { endCell: number; startCell: number } {
  const startCell = dateTimeToFractionalCellInRange(
    sprintStartDate,
    weekColumns[weekIndex].startDate,
    totalParts
  );
  const endCell = dateTimeToFractionalCellInRange(
    sprintStartDate,
    getWeekColumnEndDate(weekIndex, weekColumns, sprintInfos),
    totalParts
  );
  return {
    startCell: Math.max(0, Math.min(startCell, totalParts)),
    endCell: Math.max(0, Math.min(endCell, totalParts + 1)),
  };
}
