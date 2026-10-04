'use client';

import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay, roundPointsForDisplay } from '@/lib/pointsUtils';

import { summarizeBacklogPoints, type PointsBreakdownBuckets } from '../utils/backlogPointsBreakdown';

const TONE_CLASS = {
  done: 'bg-green-200 text-green-950 dark:bg-green-900/50 dark:text-green-100',
  progress: 'bg-blue-200 text-blue-950 dark:bg-blue-900/60 dark:text-blue-100',
  todo: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-100',
} as const;

const BUCKETS = ['todo', 'progress', 'done'] as const;

interface BacklogPointsBreakdownProps {
  tasks: readonly Task[];
}

function bucketSum(buckets: PointsBreakdownBuckets): number {
  return BUCKETS.reduce((sum, bucket) => sum + roundPointsForDisplay(buckets[bucket]), 0);
}

export function BacklogPointsBreakdown({ tasks }: BacklogPointsBreakdownProps) {
  const { t } = useI18n();
  const summary = summarizeBacklogPoints(tasks);
  const groups = [
    { buckets: summary.sp, label: t('backlog.points.story') },
    { buckets: summary.tp, label: t('backlog.points.test') },
  ].filter((group) => bucketSum(group.buckets) > 0);

  if (groups.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {groups.map((group) => (
        <span key={group.label} className="inline-flex items-center gap-1">
          {BUCKETS.map((bucket) => {
            const bucketLabel = t(`backlog.points.${bucket}`);
            return (
              <span
                key={bucket}
                className={`inline-flex min-w-5 items-center justify-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium tabular-nums leading-none ${TONE_CLASS[bucket]}`}
                title={`${group.label}: ${bucketLabel}`}
              >
                {formatPointsForDisplay(group.buckets[bucket])}
              </span>
            );
          })}
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{group.label}</span>
        </span>
      ))}
    </span>
  );
}
