'use client';

import type { SprintListItem } from '@/types/tracker';

import { BurndownChartLoadingBody } from './BurndownChartLoadingBody';
import { BurndownChartStatusShell } from './BurndownChartStatusShell';

export function BurndownChartLoadingState({
  boardId,
  sprintId,
  sprints,
  sprintsLoading,
  t,
  onSprintChange,
}: {
  boardId?: number | null;
  sprintId: number;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  t: (key: string) => string;
  onSprintChange: (sprintId: number | null) => void;
}) {
  return (
    <BurndownChartStatusShell
      boardId={boardId}
      isLoading
      selectedSprintId={sprintId}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
      <BurndownChartLoadingBody message={t('burndown.loadingData')} />
    </BurndownChartStatusShell>
  );
}
