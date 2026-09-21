'use client';

import type { SprintListItem } from '@/types/tracker';

import { BurndownChartStatusShell } from './BurndownChartStatusShell';

export function BurndownChartErrorState({
  boardId,
  error,
  sprintId,
  sprints,
  sprintsLoading,
  t,
  onSprintChange,
}: {
  boardId?: number | null;
  error: unknown;
  sprintId: number;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  t: (key: string) => string;
  onSprintChange: (sprintId: number | null) => void;
}) {
  return (
    <BurndownChartStatusShell
      boardId={boardId}
      selectedSprintId={sprintId}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
      <div className="text-center text-red-500 dark:text-red-400">
        <p className="text-lg font-medium mb-2">{t('burndown.loadErrorTitle')}</p>
        <p className="text-sm">
          {error instanceof Error ? error.message : t('burndown.loadErrorFallback')}
        </p>
      </div>
    </BurndownChartStatusShell>
  );
}
