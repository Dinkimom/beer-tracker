'use client';

import type { QuarterlySprintInfo } from '../../types';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  buildQuarterlyMonthSpans,
  buildQuarterlyWeekColumns,
  formatWeekStartLabel,
} from '@/features/quarterly-planning-v2/utils/quarterlyTimelineHeader';

import { useQuarterlySprintGoalsMap } from '../../hooks/useQuarterlySprintGoalsMap';
import { useQuarterlySprintScoreMap } from '../../hooks/useQuarterlySprintScoreMap';

import { QuarterlyPlannerSprintHeaderTh } from './QuarterlyPlannerSprintHeaderTh';
import { QuarterlyPlannerStickyColumnEdge } from './QuarterlyPlannerStickyColumnEdge';

const HEADER_ROW_HEIGHT = 40;

interface QuarterlyPlannerTableHeaderProps {
  currentSprintIndex: number;
  dateLocale: string;
  dayColumnWidth: number | undefined;
  isResizing: boolean;
  sprintInfos: QuarterlySprintInfo[];
  statusColumnWidth: number;
  taskColumnWidth: number;
  setIsResizing: (value: boolean) => void;
}

export function QuarterlyPlannerTableHeader({
  currentSprintIndex,
  dateLocale,
  dayColumnWidth,
  isResizing,
  setIsResizing,
  sprintInfos,
  statusColumnWidth,
  taskColumnWidth,
}: QuarterlyPlannerTableHeaderProps) {
  const { t } = useI18n();
  const weekColumns = buildQuarterlyWeekColumns(sprintInfos);
  const monthSpans = buildQuarterlyMonthSpans(weekColumns, dateLocale);
  const { data: sprintGoalsBySprintId } = useQuarterlySprintGoalsMap(sprintInfos);
  const { data: sprintScoreMap } = useQuarterlySprintScoreMap(sprintInfos);
  const rowH = HEADER_ROW_HEIGHT + 1;

  const quarterlyTimelineThStyle = {
    height: rowH,
    minHeight: rowH,
    maxHeight: rowH,
    boxSizing: 'border-box' as const,
  };
  const quarterlyTimelineThDivider =
    '[box-shadow:inset_0_-1px_0_#e5e7eb] dark:[box-shadow:inset_0_-1px_0_#374151]';
  const quarterlyMonthHeaderBg = 'bg-gray-50 dark:bg-gray-800/90';
  const quarterlyTimelineThClass = `px-2 py-0 text-center align-middle text-xs leading-tight overflow-hidden whitespace-nowrap border-r border-gray-200 dark:border-gray-700 ${quarterlyTimelineThDivider}`;
  /** Горизонтальные линии между строками шапки внутри rowSpan (нижний край — border-b). */
  const stickyColInternalRowDividers = `[box-shadow:inset_0_-${rowH * 2}px_0_#e5e7eb,inset_0_-${rowH}px_0_#e5e7eb] dark:[box-shadow:inset_0_-${rowH * 2}px_0_#374151,inset_0_-${rowH}px_0_#374151]`;
  const stickyHeaderBottomBorder = 'border-b border-gray-200 dark:border-gray-700';
  const stickyHeaderBaseClass = `sticky z-[11] ${quarterlyMonthHeaderBg} px-2 align-middle text-center text-xs font-semibold text-gray-700 dark:text-gray-300 ${stickyHeaderBottomBorder} ${stickyColInternalRowDividers}`;

  const titleTh = (
    <th
      className={`relative left-0 ${stickyHeaderBaseClass}`}
      rowSpan={3}
      style={{
        width: taskColumnWidth,
        minWidth: taskColumnWidth,
        minHeight: rowH * 3,
        verticalAlign: 'middle',
      }}
    >
      <QuarterlyPlannerStickyColumnEdge zIndex={ZIndex.stickyMainHeader + 1} />
      <SidebarResizeHandle
        isResizing={isResizing}
        side="right"
        title={t('sprintPlanner.occupancy.resizeTaskColumn')}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
        }}
      />
      <span className="block truncate">{t('sprintPlanner.occupancy.columnTitle')}</span>
    </th>
  );

  const statusTh = (
    <th
      className={`${stickyHeaderBaseClass} border-r border-gray-200 dark:border-gray-600`}
      rowSpan={3}
      style={{
        left: taskColumnWidth,
        width: statusColumnWidth,
        minWidth: statusColumnWidth,
        minHeight: rowH * 3,
        verticalAlign: 'middle',
      }}
    >
      <span className="block truncate">{t('planning.quarterlyV2.taskStatusColumn')}</span>
    </th>
  );

  return (
    <thead>
      <tr
        className="sticky top-0 bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden"
        style={{ height: rowH, zIndex: ZIndex.stickyMainHeader + 2 }}
      >
        {titleTh}
        {statusTh}
        {monthSpans.map((span) => (
          <th
            key={span.monthKey}
            className={`${quarterlyTimelineThClass} font-semibold capitalize text-gray-700 dark:text-gray-300 ${quarterlyMonthHeaderBg}`}
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
        {sprintInfos.map((sprint, idx) => (
          <QuarterlyPlannerSprintHeaderTh
            key={sprint.id}
            currentSprintIndex={currentSprintIndex}
            hideTp={sprintScoreMap?.hideTp}
            idx={idx}
            quarterlyTimelineThClass={quarterlyTimelineThClass}
            quarterlyTimelineThStyle={quarterlyTimelineThStyle}
            sprint={sprint}
            sprintGoalsBySprintId={sprintGoalsBySprintId}
            sprintInfos={sprintInfos}
            sprintScoreMap={sprintScoreMap?.scoresBySprintId}
          />
        ))}
      </tr>
    </thead>
  );
}
