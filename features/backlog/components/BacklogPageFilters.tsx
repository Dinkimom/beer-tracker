'use client';

import type { BacklogFilterPerson } from '@/features/backlog/utils/backlogFilterPeople';
import type { StatusFilter } from '@/types';

import { Button } from '@/components/Button';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';

import { BacklogAssigneeFilter } from './BacklogAssigneeFilter';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'active', 'completed'];

const STATUS_LABEL_KEY: Record<StatusFilter, string> = {
  active: 'sidebar.tasksTab.status.active.label',
  all: 'sidebar.tasksTab.status.all.label',
  completed: 'sidebar.tasksTab.status.completed.label',
};

interface BacklogPageFiltersProps {
  assigneeIds: ReadonlySet<string>;
  nameFilter: string;
  people: BacklogFilterPerson[];
  statusFilter: StatusFilter;
  onAssigneeToggle: (id: string) => void;
  onNameFilterChange: (value: string) => void;
  onReset: () => void;
  onStatusFilterChange: (value: StatusFilter) => void;
}

export function BacklogPageFilters({
  assigneeIds,
  nameFilter,
  people,
  statusFilter,
  onAssigneeToggle,
  onNameFilterChange,
  onReset,
  onStatusFilterChange,
}: BacklogPageFiltersProps) {
  const { t } = useI18n();
  const filtersActive = nameFilter.trim() !== '' || statusFilter !== 'all' || assigneeIds.size > 0;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <SearchInput
        aria-label={t('backlog.filters.searchAria')}
        className="!w-64 shrink-0"
        placeholder={t('backlog.filters.searchPlaceholder')}
        size="md"
        value={nameFilter}
        onChange={onNameFilterChange}
      />
      <BacklogAssigneeFilter people={people} selectedIds={assigneeIds} onToggle={onAssigneeToggle} />
      <div aria-label={t('backlog.filters.statusAria')} className="flex shrink-0 gap-1" role="group">
        {STATUS_OPTIONS.map((option) => (
          <Button
            key={option}
            aria-pressed={statusFilter === option}
            className="!h-8 !px-2.5 !py-0 text-xs"
            type="button"
            variant={statusFilter === option ? 'accent' : 'outline'}
            onClick={() => onStatusFilterChange(option)}
          >
            {t(STATUS_LABEL_KEY[option])}
          </Button>
        ))}
      </div>
      {filtersActive ? (
        <Button className="!h-8 !px-2 text-xs" type="button" variant="ghost" onClick={onReset}>
          {t('backlog.filters.reset')}
        </Button>
      ) : null}
    </div>
  );
}
