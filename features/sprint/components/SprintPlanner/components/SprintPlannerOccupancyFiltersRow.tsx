'use client';

import type { Developer, StatusFilter } from '@/types';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import { OccupancyAssigneeFilter } from './OccupancyAssigneeFilter';

interface SprintPlannerOccupancyFiltersRowProps {
  developers: Developer[];
  occupancyStatusFilter: StatusFilter;
  selectedAssigneeIds: Set<string>;
  statusFilterOptions: Array<{ label: string; value: StatusFilter }>;
  setOccupancyStatusFilter: (value: StatusFilter) => void;
  setSelectedAssigneeIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function SprintPlannerOccupancyFiltersRow({
  developers,
  occupancyStatusFilter,
  selectedAssigneeIds,
  setOccupancyStatusFilter,
  setSelectedAssigneeIds,
  statusFilterOptions,
}: SprintPlannerOccupancyFiltersRowProps) {
  const { t } = useI18n();

  return (
    <div className="-mx-4 flex flex-wrap items-center gap-2 border-t border-ds-border-subtle px-4 pt-2 sm:gap-x-3">
      <CustomSelect<StatusFilter>
        className="min-w-[11rem] max-w-[min(100%,13rem)] shrink-0 sm:min-w-[12.5rem] sm:max-w-[200px]"
        options={statusFilterOptions}
        selectedPrefix={t('sprintPlanner.controls.taskStatusPrefix')}
        size="compact"
        title={t('sprintPlanner.controls.statusFilterTitle')}
        value={occupancyStatusFilter}
        onChange={setOccupancyStatusFilter}
      />
      <OccupancyAssigneeFilter
        className="w-[min(100%,11rem)] shrink-0 sm:w-[min(100%,13rem)] lg:w-auto lg:max-w-none"
        developers={developers}
        selectedAssigneeIds={selectedAssigneeIds}
        onSelectionChange={setSelectedAssigneeIds}
      />
    </div>
  );
}
