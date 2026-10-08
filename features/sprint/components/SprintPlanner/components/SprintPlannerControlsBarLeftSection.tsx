'use client';

import type { BacklogFilterPerson } from '@/features/backlog/utils/backlogFilterPeople';
import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { SprintListItem } from '@/types/tracker';

import { ReleaseHoroscopeChip } from '@/components/ReleaseHoroscopeChip';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';
import { BacklogAssigneeFilter } from '@/features/backlog/components/BacklogAssigneeFilter';

import { SprintSelectorWithCreate } from '../../SprintSelectorWithCreate';

interface SprintPlannerControlsBarLeftSectionProps {
  assigneeFilterPeople?: BacklogFilterPerson[];
  boardId: number | null;
  globalNameFilter: string;
  selectedAssigneeIds: Set<string>;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasksLoading: boolean;
  viewMode: BoardViewMode;
  onAssigneeToggle: (id: string) => void;
  onSprintChange: (sprintId: number | null) => void;
  setGlobalNameFilter: (value: string) => void;
}

export function SprintPlannerControlsBarLeftSection({
  assigneeFilterPeople = [],
  boardId,
  globalNameFilter,
  selectedAssigneeIds,
  selectedSprintId,
  setGlobalNameFilter,
  sprints,
  sprintsLoading,
  tasksLoading,
  viewMode,
  onAssigneeToggle,
  onSprintChange,
}: SprintPlannerControlsBarLeftSectionProps) {
  const { t } = useI18n();
  const showKanbanAssigneeFilter = viewMode === 'kanban' && assigneeFilterPeople.length > 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-x-3">
      <div className="max-w-[min(100%,24rem)] shrink-0">
        <SprintSelectorWithCreate
          boardId={boardId}
          loading={tasksLoading}
          selectedSprintId={selectedSprintId}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          surface="glass"
          onSprintChange={onSprintChange}
        />
      </div>
      <div className="min-w-0 max-w-[16rem] flex-1 basis-[12rem]">
        <SearchInput
          className="min-w-0 max-w-full"
          placeholder={t('sprintPlanner.controls.searchPlaceholder')}
          size="md"
          surface="glass"
          value={globalNameFilter}
          onChange={setGlobalNameFilter}
        />
      </div>
      {showKanbanAssigneeFilter ? (
        <BacklogAssigneeFilter
          people={assigneeFilterPeople}
          selectedIds={selectedAssigneeIds}
          onToggle={onAssigneeToggle}
        />
      ) : null}
      <ReleaseHoroscopeChip />
    </div>
  );
}
