'use client';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

import { burndownIslandClassName } from './burndownAreaChartHelpers';

interface BurndownMetricTileProps {
  barColor: string;
  completed: number;
  completionPercent: number;
  remainingLabel: string;
  title: string;
  total: number;
}

export function BurndownMetricTile({
  barColor,
  completed,
  completionPercent,
  remainingLabel,
  title,
  total,
}: BurndownMetricTileProps) {
  return (
    <div className={`${burndownIslandClassName} p-4`}>
      <h3 className="mb-2 text-sm font-medium text-ds-text-muted">{title}</h3>
      <div className="mb-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {formatPointsForDisplay(completed)} / {formatPointsForDisplay(total)}
      </div>
      <p className="mb-2 text-xs text-ds-text-muted">{remainingLabel}</p>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${completionPercent}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="min-w-[3rem] text-right text-sm font-medium text-ds-text-muted">
          {completionPercent}%
        </span>
      </div>
    </div>
  );
}
