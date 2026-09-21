'use client';

import type { ReactNode } from 'react';

interface QuarterlyPlannerTimelineWeekStripProps {
  children?: ReactNode | ((weekIndex: number) => ReactNode);
  className?: string;
  /** Растянуть на 100% высоты родителя (minHeight = rowHeightPx). */
  fillContainer?: boolean;
  rowHeightPx: number;
  /** Вертикальные линии между неделями (в строке плана — выключено). */
  showWeekDividers?: boolean;
  weekColumnWidth: number | undefined;
  weekCount: number;
}

/** Общая сетка недельных колонок для подстрок таймлайна. */
export function QuarterlyPlannerTimelineWeekStrip({
  weekCount,
  weekColumnWidth,
  rowHeightPx,
  className = '',
  fillContainer = false,
  showWeekDividers = true,
  children,
}: QuarterlyPlannerTimelineWeekStripProps) {
  const weekColClass = showWeekDividers
    ? 'relative flex flex-1 min-w-0 border-r border-gray-200 dark:border-gray-600 last:border-r-0'
    : 'relative flex flex-1 min-w-0';

  return (
    <div
      className={`flex w-full items-stretch ${className}`}
      style={
        fillContainer
          ? { height: '100%', minHeight: rowHeightPx }
          : { height: rowHeightPx, minHeight: rowHeightPx }
      }
    >
      {Array.from({ length: weekCount }, (_, weekIndex) => (
        <div
          key={weekIndex}
          className={weekColClass}
          style={{
            width: weekColumnWidth ?? `${100 / weekCount}%`,
            minWidth: 0,
          }}
        >
          {typeof children === 'function' ? children(weekIndex) : children}
        </div>
      ))}
    </div>
  );
}
