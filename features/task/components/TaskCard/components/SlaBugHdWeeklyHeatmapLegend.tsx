'use client';

import { LEVEL_CELL_CLASSES } from './SlaBugHdWeeklyHeatmapCell';

interface SlaBugHdWeeklyHeatmapLegendProps {
  t: (key: string) => string;
}

export function SlaBugHdWeeklyHeatmapLegend({ t }: SlaBugHdWeeklyHeatmapLegendProps) {
  return (
    <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
      <span>{t('sidebar.bugsTab.tooltip.heatmapLess')}</span>
      <div className="flex gap-[2px]">
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={`block size-[9px] rounded-[2px] ${LEVEL_CELL_CLASSES[level]}`}
          />
        ))}
      </div>
      <span>{t('sidebar.bugsTab.tooltip.heatmapMore')}</span>
    </div>
  );
}
