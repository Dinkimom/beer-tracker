'use client';

import type { AppLanguage } from '@/lib/i18n/model';
import type { HdWeeklyHeatmapWeek } from '@/lib/overseer/hdWeeklyHeatmap';

import { hdHeatmapLevel } from '@/lib/overseer/hdWeeklyHeatmap';

import { formatWeekDetailLabel } from './slaBugHdWeeklyHeatmapFormat';

const LEVEL_CELL_CLASSES: Record<ReturnType<typeof hdHeatmapLevel>, string> = {
  0: 'bg-gray-100 dark:bg-gray-700/70',
  1: 'bg-emerald-200/90 dark:bg-emerald-900/70',
  2: 'bg-emerald-400/90 dark:bg-emerald-700',
  3: 'bg-emerald-600 dark:bg-emerald-500',
  4: 'bg-emerald-800 dark:bg-emerald-300',
};

interface SlaBugHdWeeklyHeatmapCellProps {
  active: boolean;
  language: AppLanguage;
  maxCount: number;
  week: HdWeeklyHeatmapWeek;
  onActivate: () => void;
  t: (key: string, params?: Record<string, number | string>) => string;
}

export function SlaBugHdWeeklyHeatmapCell({
  week,
  maxCount,
  language,
  active,
  onActivate,
  t,
}: SlaBugHdWeeklyHeatmapCellProps) {
  const level = hdHeatmapLevel(week.count, maxCount);
  const ariaLabel = formatWeekDetailLabel(week, language, t);

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`aspect-square w-full min-w-0 cursor-pointer rounded-[3px] transition-[transform,filter] duration-100 hover:brightness-110 focus-visible:outline-none dark:hover:brightness-125 ${LEVEL_CELL_CLASSES[level]} ${
        active ? 'brightness-110 dark:brightness-125' : ''
      }`}
      type="button"
      onClick={onActivate}
      onFocus={onActivate}
      onMouseEnter={onActivate}
    />
  );
}

export { LEVEL_CELL_CLASSES };
