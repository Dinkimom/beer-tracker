'use client';

import type { SprintListItem } from '@/types/tracker';

import { SprintSelectorWithCreate } from '@/features/sprint/components/SprintSelectorWithCreate';

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
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center">
          <div className="shrink-0">
            <SprintSelectorWithCreate
              boardId={boardId}
              loading={isLoading}
              selectedSprintId={selectedSprintId}
              sprints={sprints}
              sprintsLoading={sprintsLoading}
              onSprintChange={onSprintChange}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center flex-1">{children}</div>
    </div>
  );
}
