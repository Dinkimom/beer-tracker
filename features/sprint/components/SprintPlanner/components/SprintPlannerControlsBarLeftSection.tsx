'use client';

import type { SprintListItem } from '@/types/tracker';

import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';

import { SprintSelectorWithCreate } from '../../SprintSelectorWithCreate';

interface SprintPlannerControlsBarLeftSectionProps {
  boardId: number | null;
  globalNameFilter: string;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasksLoading: boolean;
  onSprintChange: (sprintId: number | null) => void;
  setGlobalNameFilter: (value: string) => void;
}

export function SprintPlannerControlsBarLeftSection({
  boardId,
  globalNameFilter,
  selectedSprintId,
  setGlobalNameFilter,
  sprints,
  sprintsLoading,
  tasksLoading,
  onSprintChange,
}: SprintPlannerControlsBarLeftSectionProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-x-3">
      <div className="max-w-[min(100%,24rem)] shrink-0">
        <SprintSelectorWithCreate
          boardId={boardId}
          loading={tasksLoading}
          selectedSprintId={selectedSprintId}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          onSprintChange={onSprintChange}
        />
      </div>
      <span
        aria-hidden
        className="hidden h-6 w-px shrink-0 self-center bg-ds-border-subtle sm:block"
      />
      <div className="min-w-0 max-w-[16rem] flex-1 basis-[12rem]">
        <SearchInput
          className="min-w-0 max-w-full"
          placeholder={t('sprintPlanner.controls.searchPlaceholder')}
          size="md"
          value={globalNameFilter}
          onChange={setGlobalNameFilter}
        />
      </div>
    </div>
  );
}
