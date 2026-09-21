'use client';

import { formatPointsForDisplay } from '@/lib/pointsUtils';

export function SprintScoreMetricBar({
  label,
  value,
  completed,
  total,
  colorClass,
}: {
  colorClass: { bar: string; text: string };
  completed: number;
  label: string;
  total: number;
  value: number;
}) {
  const pct = Math.min(100, value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider shrink-0 ${colorClass.text}`}>
          {label}
        </span>
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400 shrink-0">
          {formatPointsForDisplay(completed)}/{formatPointsForDisplay(total)}
          <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
        </span>
      </div>
      <div
        aria-label={`${label}: ${pct}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={pct}
        className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${colorClass.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
