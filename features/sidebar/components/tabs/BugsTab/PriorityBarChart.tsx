'use client';

import {
  SLA_BUG_CHART_PRIORITIES,
  type SlaBugWeeklyBucketStats,
} from '@/lib/slaBugs/sidebarStats';

import { PriorityBarColumn } from './PriorityBarColumn';

const PLOT_HEIGHT_PX = 72;
const MIN_SCALE_MAX = 4;

interface PriorityBarChartProps {
  ariaLabel: string;
  bucket: SlaBugWeeklyBucketStats;
  title: string;
}

export function PriorityBarChart({ ariaLabel, bucket, title }: PriorityBarChartProps) {
  const counts = SLA_BUG_CHART_PRIORITIES.map((priority) => bucket.byPriority[priority]);
  const maxCount = Math.max(1, ...counts);
  const scaleMax = Math.max(maxCount, MIN_SCALE_MAX);

  return (
    <div
      aria-label={ariaLabel}
      className="min-w-0 rounded-lg border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-600 dark:bg-gray-900/35"
      role="img"
    >
      <p className="mb-2 text-[11px] font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <div className="grid grid-cols-5 gap-1">
        {SLA_BUG_CHART_PRIORITIES.map((priority) => {
          const count = bucket.byPriority[priority];
          const hasValue = count > 0;
          const barHeight = hasValue
            ? Math.max(10, Math.round((count / scaleMax) * PLOT_HEIGHT_PX))
            : 0;

          return (
            <PriorityBarColumn
              key={priority}
              barHeight={barHeight}
              count={count}
              hasValue={hasValue}
              priority={priority}
              tasks={bucket.tasksByPriority[priority]}
            />
          );
        })}
      </div>
    </div>
  );
}
