'use client';

import type { SprintListItem } from '@/types/tracker';

import { BurndownChartStatusShell } from './BurndownChartStatusShell';

export function BurndownChartEmptySprintState({
  boardId,
  sprints,
  sprintsLoading,
  t,
  onSprintChange,
}: {
  boardId?: number | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  t: (key: string) => string;
  onSprintChange: (sprintId: number | null) => void;
}) {
  return (
    <BurndownChartStatusShell
      boardId={boardId}
      selectedSprintId={null}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium mb-2">{t('burndown.selectSprintTitle')}</p>
        <p className="text-sm">{t('burndown.selectSprintDescription')}</p>
      </div>
    </BurndownChartStatusShell>
  );
}
