'use client';

import type { QuarterlySprintInfo } from '../types';

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';

import { getPartsPerDay } from '@/constants';

import { buildQuarterlyWeekColumns, countWorkingDaysInSprint } from '../utils/quarterlyTimelineHeader';

export function useQuarterlyPlannerTableDimensions({
  sprintInfos,
  tableScrollRef,
  taskColumnWidth,
  statusColumnWidth,
}: {
  sprintInfos: QuarterlySprintInfo[];
  tableScrollRef: RefObject<HTMLDivElement | null>;
  statusColumnWidth: number;
  taskColumnWidth: number;
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const weekColumns = useMemo(() => buildQuarterlyWeekColumns(sprintInfos), [sprintInfos]);
  const weekCount = weekColumns.length;
  const workingDays = useMemo(
    () => sprintInfos.reduce((sum, s) => sum + countWorkingDaysInSprint(s), 0) || 10,
    [sprintInfos]
  );

  useLayoutEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
  }, [tableScrollRef, taskColumnWidth, statusColumnWidth]);

  const stickyColumnsWidth = taskColumnWidth + statusColumnWidth;
  const timelineWidth = Math.max(0, containerWidth - stickyColumnsWidth);
  const dayColumnWidth = weekCount > 0 && timelineWidth > 0 ? timelineWidth / weekCount : undefined;
  const timelineTotalParts = workingDays * getPartsPerDay();
  const tableWidth =
    timelineWidth > 0 && dayColumnWidth != null
      ? stickyColumnsWidth + dayColumnWidth * weekCount
      : undefined;

  return {
    dayColumnWidth,
    tableWidth,
    timelineTotalParts,
    weekColumns,
    weekCount,
    workingDays,
  };
}
