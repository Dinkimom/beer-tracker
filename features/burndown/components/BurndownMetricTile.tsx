'use client';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

interface BurndownMetricTileProps {
  barClassName: string;
  completed: number;
  completionPercent: number;
  remainingLabel: string;
  title: string;
  total: number;
}

export function BurndownMetricTile({
  barClassName,
  completed,
  completionPercent,
  remainingLabel,
  title,
  total,
}: BurndownMetricTileProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {formatPointsForDisplay(completed)} / {formatPointsForDisplay(total)}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{remainingLabel}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`${barClassName} h-full transition-all duration-300`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
          {completionPercent}%
        </span>
      </div>
    </div>
  );
}
