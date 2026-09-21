'use client';

import { useMemo, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useHdWeeklyHeatmap } from '@/features/sla-bugs/hooks/useHdWeeklyHeatmap';
import { HD_HEATMAP_COLUMNS } from '@/lib/overseer/hdWeeklyHeatmap';

import { SlaBugHdWeeklyHeatmapCell } from './SlaBugHdWeeklyHeatmapCell';
import { formatWeekDetailLabel } from './slaBugHdWeeklyHeatmapFormat';
import { SlaBugHdWeeklyHeatmapLegend } from './SlaBugHdWeeklyHeatmapLegend';

interface SlaBugHdWeeklyHeatmapProps {
  createdAt?: string;
  enabled: boolean;
  hdCount?: number;
  issueKey: string;
}

export function SlaBugHdWeeklyHeatmap({
  issueKey,
  createdAt,
  hdCount,
  enabled,
}: SlaBugHdWeeklyHeatmapProps) {
  const { language, t } = useI18n();
  const [activeWeekStart, setActiveWeekStart] = useState<string | null>(null);
  const { data, isLoading, isError } = useHdWeeklyHeatmap(issueKey, createdAt, hdCount, enabled);

  const activeWeek = useMemo(
    () => data?.weeks.find((week) => week.weekStart === activeWeekStart) ?? null,
    [activeWeekStart, data?.weeks]
  );

  if (isLoading) {
    return (
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        {t('sidebar.bugsTab.tooltip.heatmapLoading')}
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        {t('sidebar.bugsTab.tooltip.heatmapUnavailable')}
      </p>
    );
  }

  if (data.weeks.length === 0) {
    return (
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        {t('sidebar.bugsTab.tooltip.heatmapEmpty')}
      </p>
    );
  }

  const rows = data.weeks;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
          {t('sidebar.bugsTab.tooltip.heatmapTitle')}
        </p>
        <SlaBugHdWeeklyHeatmapLegend t={t} />
      </div>

      <div
        className="flex w-full min-w-0 flex-col gap-1.5"
        onMouseLeave={() => setActiveWeekStart(null)}
      >
        <div
          className="grid w-full min-w-0 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${HD_HEATMAP_COLUMNS}, minmax(0, 1fr))` }}
        >
          {rows.map((week) => (
            <SlaBugHdWeeklyHeatmapCell
              key={week.weekStart}
              active={activeWeekStart === week.weekStart}
              language={language}
              maxCount={data.maxCount}
              t={t}
              week={week}
              onActivate={() => setActiveWeekStart(week.weekStart)}
            />
          ))}
        </div>

        <p
          aria-live="polite"
          className="min-h-4 text-xs leading-snug text-gray-700 dark:text-gray-200"
        >
          {activeWeek
            ? formatWeekDetailLabel(activeWeek, language, t)
            : t('sidebar.bugsTab.tooltip.heatmapHint')}
        </p>
      </div>
    </div>
  );
}
