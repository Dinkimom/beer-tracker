'use client';

import type { SlaBugNeedToClosePriority } from '@/lib/slaBugs/qualityZone';

function priorityBadgeClass(priority: SlaBugNeedToClosePriority): string {
  switch (priority) {
    case 'P0':
      return 'bg-red-500 text-white dark:bg-red-400';
    case 'P1':
      return 'bg-orange-500 text-white dark:bg-orange-400';
    case 'P2':
      return 'bg-amber-500 text-white dark:bg-amber-400';
  }
}

interface NeedToCloseCardProps {
  count: number;
  priority: SlaBugNeedToClosePriority;
}

export function NeedToCloseCard({ count, priority }: NeedToCloseCardProps) {
  return (
    <div className="flex min-w-[3.25rem] items-center gap-1.5 rounded-md border border-gray-200 bg-white/70 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-800/80">
      <span
        className={`inline-flex shrink-0 rounded px-1 py-0.5 text-[10px] font-bold leading-none ${priorityBadgeClass(priority)}`}
      >
        {priority}
      </span>
      <span className="text-lg font-semibold tabular-nums leading-none text-gray-900 dark:text-gray-100">
        {count}
      </span>
    </div>
  );
}
