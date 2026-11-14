'use client';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { groupWeeksByMonth } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  formatWeekRange,
  QUARTER_HEADER_ROW_PX,
  QUARTER_LEFT_COLUMN_WIDTH,
  QUARTER_WEEK_LINE,
} from '../quarterlyPlanBoardModel';

interface QuarterlyPlanTimelineHeaderProps {
  columnLabel: string;
  /** Квартал, который показывает доска: «Q4 2026». */
  title: string;
}

/** Липкая шапка: месяцы и недели квартала, текущая неделя выделена. */
export function QuarterlyPlanTimelineHeader({ columnLabel, title }: QuarterlyPlanTimelineHeaderProps) {
  const { language } = useI18n();
  const { currentWeek, weeks } = useQuarterlyPlanBoard();
  const weekWidth = 100 / weeks.length;
  const monthFormat = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' });

  return (
    <div
      className="sticky top-0 flex border-b border-ds-border-subtle bg-white dark:bg-gray-800"
      data-quarter-header
      style={{ zIndex: ZIndex.stickyInContent + 2 }}
    >
      {/* Левая ячейка повторяет две строки шапки: квартал — напротив месяцев, подпись колонки — напротив недель. */}
      <div
        className="sticky left-0 flex shrink-0 flex-col border-r border-ds-border-subtle bg-white dark:bg-gray-800"
        style={{ width: QUARTER_LEFT_COLUMN_WIDTH, zIndex: ZIndex.stickyInContent + 3 }}
      >
        <div
          className="flex items-center border-b border-ds-border-subtle px-3 text-xs font-semibold text-gray-900 dark:text-gray-100"
          style={{ height: QUARTER_HEADER_ROW_PX }}
        >
          {title}
        </div>
        <div className="flex items-center px-3 text-[11px] text-ds-text-muted" style={{ height: QUARTER_HEADER_ROW_PX }}>
          {columnLabel}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="relative -left-px flex border-b border-ds-border-subtle"
          style={{ height: QUARTER_HEADER_ROW_PX }}
        >
          {groupWeeksByMonth(weeks).map((group) => (
            <div
              key={group.startWeek}
              className={`flex items-center truncate px-3 text-xs font-semibold capitalize text-gray-900 dark:text-gray-100 ${
                group.startWeek > 0 ? 'border-l border-ds-border-subtle' : ''
              }`}
              style={{ width: `${group.weeks * weekWidth}%` }}
            >
              {monthFormat.format(new Date(2026, group.month, 15))}
            </div>
          ))}
        </div>
        <div className="relative -left-px flex" style={{ height: QUARTER_HEADER_ROW_PX }}>
          {weeks.map((week) => (
            <div
              key={week.index}
              className={`flex items-center justify-center truncate text-[11px] tabular-nums ${
                week.index === currentWeek
                  ? 'bg-blue-500/10 font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200'
                  : 'text-ds-text-muted'
              }`}
              style={{
                width: `${weekWidth}%`,
                ...(week.index > 0
                  ? {
                      borderLeft: `1px solid ${
                        week.month === weeks[week.index - 1]!.month
                          ? QUARTER_WEEK_LINE
                          : 'var(--ds-border-subtle)'
                      }`,
                    }
                  : {}),
              }}
            >
              {formatWeekRange(week)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
