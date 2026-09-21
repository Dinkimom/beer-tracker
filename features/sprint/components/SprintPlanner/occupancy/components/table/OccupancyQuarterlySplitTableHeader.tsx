'use client';

import type { SprintInfo } from './occupancyTableHeaderTypes';

import { QUARTERLY_STATUS_COLUMN_WIDTH_PX } from '@/features/quarterly-planning-v2/components/planner/quarterlyPlannerLayout';
import { QuarterlyPlannerTableHeader } from '@/features/quarterly-planning-v2/components/planner/QuarterlyPlannerTableHeader';

export function OccupancyQuarterlySplitTableHeader({
  currentSprintIndex,
  dateLocale,
  dayColumnWidth,
  isResizing,
  setIsResizing,
  sprintInfos,
  taskColumnWidth,
}: {
  currentSprintIndex: number;
  dateLocale: string;
  dayColumnWidth: number | undefined;
  isResizing: boolean;
  setIsResizing: (value: boolean) => void;
  sprintInfos: SprintInfo[];
  taskColumnWidth: number;
}) {
  return (
    <QuarterlyPlannerTableHeader
      currentSprintIndex={currentSprintIndex}
      dateLocale={dateLocale}
      dayColumnWidth={dayColumnWidth}
      isResizing={isResizing}
      setIsResizing={setIsResizing}
      sprintInfos={sprintInfos}
      statusColumnWidth={QUARTERLY_STATUS_COLUMN_WIDTH_PX}
      taskColumnWidth={taskColumnWidth}
    />
  );
}
