'use client';

import { OverflowTooltip } from '@/components/OverflowTooltip';
import { formatSprintTotalsPointsLabels } from '@/lib/pointsUtils';

interface KanbanColumnHeaderProps {
  displayName: string;
  taskCount: number;
  totalSp: number;
  totalTp: number;
}

export function KanbanColumnHeader({
  displayName,
  taskCount,
  totalSp,
  totalTp,
}: KanbanColumnHeaderProps) {
  const { spLabel, tpLabel } = formatSprintTotalsPointsLabels(totalSp, totalTp, 'spaced');
  const hasPoints = Boolean(spLabel || tpLabel);

  return (
    <div className="shrink-0 border-b border-gray-200/90 px-3 pb-2 pt-2.5 dark:border-white/10">
      <div className="flex min-w-0 items-center gap-2">
        <OverflowTooltip content={displayName}>
          <h3 className="min-w-0 truncate text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            {displayName}
          </h3>
        </OverflowTooltip>
        <span className="inline-flex shrink-0 items-center rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-600 shadow-sm dark:bg-white/[0.08] dark:text-gray-300 dark:shadow-none">
          {taskCount}
        </span>
      </div>
      {hasPoints ? (
        <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {spLabel ? <span>{spLabel}</span> : null}
          {spLabel && tpLabel ? ' · ' : null}
          {tpLabel ? <span>{tpLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
