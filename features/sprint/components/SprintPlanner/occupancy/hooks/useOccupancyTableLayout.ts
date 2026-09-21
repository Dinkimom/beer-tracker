import type { OccupancyTimelineScale } from '@/hooks/useLocalStorage';

import { useLayoutEffect, useRef, useState } from 'react';

import { WORKING_DAYS, WORKING_DAYS_PER_WEEK } from '@/constants';

export function useOccupancyTableLayout({
  tableScrollRef,
  taskColumnWidth,
  timelineScale,
  /** Открыт ли сайдбар планировщика — пересчёт ширины в том же layout-pass, без кадра с устаревшим ResizeObserver */
  plannerSidebarOpen = false,
  /** Ширина сайдбара (при закрытом игнорируется в вёрстке, но остаётся в state родителя) */
  plannerSidebarWidth = 0,
  /** Число колонок рабочих дней (длина спринта / сумма по спринтам) */
  workingDaysCount = WORKING_DAYS,
  statusColumnWidth = 0,
}: {
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  taskColumnWidth: number;
  timelineScale: OccupancyTimelineScale;
  plannerSidebarOpen?: boolean;
  plannerSidebarWidth?: number;
  workingDaysCount?: number;
  statusColumnWidth?: number;
}) {
  const [tableContainerWidth, setTableContainerWidth] = useState(0);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const applyWidth = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setTableContainerWidth((prev) => (prev !== w ? w : prev));
    };

    const onResizeObserved = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        applyWidth();
      });
    };

    const ro = new ResizeObserver(onResizeObserved);
    ro.observe(el);
    applyWidth();

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      ro.disconnect();
    };
  }, [tableScrollRef, taskColumnWidth, statusColumnWidth, timelineScale, plannerSidebarOpen, plannerSidebarWidth]);

  const stickyTaskColumnsWidth = taskColumnWidth + statusColumnWidth;
  const timelinePartWidth = Math.max(0, tableContainerWidth - stickyTaskColumnsWidth);
  const wd = Math.max(1, workingDaysCount);
  /** Full: неделя на ширину вьюпорта. Compact: во вьюпорте не больше WORKING_DAYS колонок; длиннее — скролл. */
  const daysBase =
    timelineScale === 'full' ? WORKING_DAYS_PER_WEEK : Math.min(WORKING_DAYS, wd);
  const dayColumnWidth =
    timelinePartWidth > 0 ? timelinePartWidth / daysBase : undefined;
  const tableWidth =
    timelinePartWidth > 0 && dayColumnWidth != null
      ? stickyTaskColumnsWidth + dayColumnWidth * wd
      : undefined;

  return {
    tableContainerWidth,
    timelinePartWidth,
    dayColumnWidth,
    tableWidth,
  };
}
