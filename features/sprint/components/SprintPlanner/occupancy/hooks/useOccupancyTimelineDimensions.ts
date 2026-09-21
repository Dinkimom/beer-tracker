'use client';

import type { OccupancyTimelineScale } from '@/hooks/useLocalStorage';

import { useMemo, type RefObject } from 'react';

import { resolveOccupancyTimelineWidths } from '../occupancyViewHelpers';

import { occupancyTimelineHeaderHeight } from './occupancyTimelineHeaderHeight';
import { useOccupancyTableLayout } from './useOccupancyTableLayout';

export function useOccupancyTimelineDimensions({
  displayAsWeeks,
  displayColumnCount,
  plannerSidebarOpen,
  plannerSidebarWidth,
  quarterlyPhaseStyle,
  quarterlyWeekTimelineHeader,
  sprintCount,
  statusColumnWidth = 0,
  tableScrollRef,
  taskColumnWidth,
  timelineScale,
  workingDays,
}: {
  displayAsWeeks: boolean;
  displayColumnCount: number;
  plannerSidebarOpen: boolean;
  plannerSidebarWidth: number;
  quarterlyPhaseStyle: boolean;
  quarterlyWeekTimelineHeader: boolean;
  sprintCount: number;
  statusColumnWidth?: number;
  tableScrollRef: RefObject<HTMLDivElement | null>;
  taskColumnWidth: number;
  timelineScale: OccupancyTimelineScale;
  workingDays: number;
}) {
  const {
    dayColumnWidth: baseDayColumnWidth,
    tableWidth: baseTableWidth,
    timelinePartWidth,
  } = useOccupancyTableLayout({
    tableScrollRef,
    taskColumnWidth,
    statusColumnWidth,
    timelineScale,
    plannerSidebarOpen,
    plannerSidebarWidth,
    workingDaysCount: workingDays,
  });

  const { dayColumnWidth, tableWidth } = useMemo(
    () =>
      resolveOccupancyTimelineWidths({
        baseDayColumnWidth,
        baseTableWidth,
        displayAsWeeks,
        displayColumnCount,
        quarterlyPhaseStyle,
        sprintCount,
        statusColumnWidth,
        taskColumnWidth,
        timelinePartWidth,
        workingDays,
      }),
    [
      baseDayColumnWidth,
      baseTableWidth,
      displayAsWeeks,
      displayColumnCount,
      quarterlyPhaseStyle,
      sprintCount,
      statusColumnWidth,
      taskColumnWidth,
      timelinePartWidth,
      workingDays,
    ]
  );

  const headerHeight = occupancyTimelineHeaderHeight(sprintCount, quarterlyWeekTimelineHeader);

  return {
    dayColumnWidth,
    headerHeight,
    tableWidth,
  };
}
