'use client';

import type { SprintListItem } from '@/types/tracker';

import { BurndownPageFrame } from './BurndownPageFrame';

interface BurndownChartStatusShellProps {
  boardId?: number | null;
  children: React.ReactNode;
  isLoading?: boolean;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  onSprintChange: (sprintId: number | null) => void;
}

export function BurndownChartStatusShell({
  boardId = null,
  children,
  isLoading = false,
  selectedSprintId,
  sprints,
  sprintsLoading = false,
  onSprintChange,
}: BurndownChartStatusShellProps) {
  return (
    <BurndownPageFrame
      boardId={boardId}
      isLoading={isLoading}
      selectedSprintId={selectedSprintId}
      sprints={sprints}
      sprintsLoading={sprintsLoading}
      onSprintChange={onSprintChange}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>
    </BurndownPageFrame>
  );
}
