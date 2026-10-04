'use client';

import type { SprintListItem } from '@/types/tracker';

import { SprintSelectorWithCreate } from '@/features/sprint/components/SprintSelectorWithCreate';

interface BurndownPageFrameProps {
  boardId?: number | null;
  children: React.ReactNode;
  isLoading?: boolean;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  onSprintChange: (sprintId: number | null) => void;
}

/** Холст страницы сгорания: селектор спринта и острова с одним левым краем. */
export function BurndownPageFrame({
  boardId = null,
  children,
  isLoading = false,
  selectedSprintId,
  sprints,
  sprintsLoading = false,
  onSprintChange,
}: BurndownPageFrameProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
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
      {children}
    </div>
  );
}
