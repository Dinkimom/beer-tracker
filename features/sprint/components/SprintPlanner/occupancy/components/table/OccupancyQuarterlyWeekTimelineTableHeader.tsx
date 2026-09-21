'use client';

import type { SprintInfo } from './occupancyTableHeaderTypes';
import type { OccupancyTaskOrder } from '@/lib/api/types';

import { WORKING_DAYS_PER_WEEK, ZIndex } from '@/constants';
import {
  buildQuarterlyMonthSpans,
  buildQuarterlyWeekColumns,
  countWorkingDaysInSprint,
  formatWeekStartLabel,
} from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import {
  formatSprintDisplayName,
  formatSprintHeaderShortLabelWithQuarter,
} from '@/utils/sprintDisplayName';

import { occupancySprintHeaderThClass } from './occupancySprintHeaderThClass';
import { isPastSprintIndex } from './occupancyTableHeaderHelpers';
import { OccupancyTableTaskColumnHeader } from './OccupancyTableTaskColumnHeader';

const HEADER_ROW_HEIGHT = 40;

export function OccupancyQuarterlyWeekTimelineTableHeader({
  allExpanded,
  currentSprintIndex,
  dateLocale,
  dayColumnWidth,
  isReorderMode,
  isResizing,
  onCollapseAll,
  onExpandAll,
  onTaskOrderChange,
  parentIds,
  setIsReorderMode,
  setIsResizing,
  sprintInfos,
  taskColumnWidth,
  totalStoryPoints,
  totalTestPoints,
}: {
  allExpanded: boolean;
  currentSprintIndex: number;
  dateLocale: string;
  dayColumnWidth: number | undefined;
  isReorderMode: boolean;
  isResizing: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  parentIds: string[];
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsResizing: (value: boolean) => void;
  sprintInfos: SprintInfo[];
  taskColumnWidth: number;
  totalStoryPoints: number;
  totalTestPoints: number;
}) {
  const weekColumns = buildQuarterlyWeekColumns(sprintInfos);
  const monthSpans = buildQuarterlyMonthSpans(weekColumns, dateLocale);
  const rowH = HEADER_ROW_HEIGHT + 1;
  const quarterlyTimelineThStyle = {
    height: rowH,
    minHeight: rowH,
    maxHeight: rowH,
    boxSizing: 'border-box' as const,
  };
  const quarterlyTimelineThDivider =
    '[box-shadow:inset_0_-1px_0_#e5e7eb] dark:[box-shadow:inset_0_-1px_0_#374151]';
  const quarterlyTimelineThClass = `px-2 py-0 text-center align-middle text-xs leading-tight overflow-hidden whitespace-nowrap border-r border-gray-200 dark:border-gray-700 ${quarterlyTimelineThDivider}`;
  const taskColRowDividerShadow = `[box-shadow:inset_0_-1px_0_#e5e7eb,inset_0_-${rowH * 2}px_0_#e5e7eb,inset_0_-${rowH}px_0_#e5e7eb] dark:[box-shadow:inset_0_-1px_0_#374151,inset_0_-${rowH * 2}px_0_#374151,inset_0_-${rowH}px_0_#374151]`;

  return (
    <thead>
      <tr
        className="sticky top-0 bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden"
        style={{ height: rowH, zIndex: ZIndex.stickyMainHeader + 2 }}
      >
        <OccupancyTableTaskColumnHeader
          allExpanded={allExpanded}
          controlsAtBottom
          headerRowHeight={rowH}
          isReorderMode={isReorderMode}
          isResizing={isResizing}
          parentIds={parentIds}
          rowDividerClass={`relative sticky left-0 z-[11] bg-gray-100 dark:bg-gray-800 px-3 align-middle ${taskColRowDividerShadow}`}
          rowSpan={3}
          setIsReorderMode={setIsReorderMode}
          setIsResizing={setIsResizing}
          taskColumnWidth={taskColumnWidth}
          totalStoryPoints={totalStoryPoints}
          totalTestPoints={totalTestPoints}
          onCollapseAll={onCollapseAll}
          onExpandAll={onExpandAll}
          onTaskOrderChange={onTaskOrderChange}
        />
        {monthSpans.map((span) => (
          <th
            key={span.monthKey}
            className={`${quarterlyTimelineThClass} font-semibold capitalize text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/90`}
            colSpan={span.colSpan}
            style={quarterlyTimelineThStyle}
            title={span.label}
          >
            <span className="block truncate">{span.label}</span>
          </th>
        ))}
      </tr>
      <tr
        className="sticky bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden"
        style={{ height: rowH, top: rowH, zIndex: ZIndex.stickyMainHeader + 1 }}
      >
        {weekColumns.map((col, idx) => {
          const weekLabel = formatWeekStartLabel(col.startDate, dateLocale);
          return (
            <th
              key={`${col.sprintId}-w${idx}`}
              className={`${quarterlyTimelineThClass} text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800`}
              style={{
                ...quarterlyTimelineThStyle,
                width: dayColumnWidth ?? '10%',
                minWidth: dayColumnWidth,
              }}
              title={weekLabel}
            >
              <span className="block truncate">{weekLabel}</span>
            </th>
          );
        })}
      </tr>
      <tr
        className="sticky bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden"
        style={{ height: rowH, top: rowH * 2, zIndex: ZIndex.stickyMainHeader }}
      >
        {sprintInfos.map((sprint, idx) => {
          const isCurrentSprint = currentSprintIndex === idx;
          const isPastSprint = isPastSprintIndex(currentSprintIndex, idx);
          const weekCount = Math.ceil(countWorkingDaysInSprint(sprint) / WORKING_DAYS_PER_WEEK);
          return (
            <th
              key={sprint.id}
              className={`${quarterlyTimelineThClass} font-semibold ${occupancySprintHeaderThClass(isCurrentSprint, isPastSprint)}`}
              colSpan={weekCount}
              style={quarterlyTimelineThStyle}
              title={formatSprintDisplayName(sprint.name, sprint.quarter)}
            >
              <span className="block truncate">
                {formatSprintHeaderShortLabelWithQuarter(sprint.name, sprint.quarter)}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
