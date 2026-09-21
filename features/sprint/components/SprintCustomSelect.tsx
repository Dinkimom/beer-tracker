'use client';

import type { SprintListItem } from '@/types/tracker';

import { useMemo } from 'react';

import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { formatSprintSelectOptionLabel } from '@/utils/sprintDisplayName';

type SprintSelectValue = '' | `${number}`;

interface SprintCustomSelectProps {
  className?: string;
  disabled?: boolean;
  emptyPlaceholder: string;
  locale?: string;
  placeholder: string;
  searchPlaceholder?: string;
  selectedSprintId: number | null;
  sprints: readonly SprintListItem[];
  onChange: (sprintId: number | null) => void;
}

export function SprintCustomSelect({
  className,
  disabled = false,
  emptyPlaceholder,
  locale = 'ru-RU',
  placeholder,
  searchPlaceholder = 'Поиск спринта...',
  selectedSprintId,
  sprints,
  onChange,
}: SprintCustomSelectProps) {
  const sprintOptions = useMemo<CustomSelectOption<SprintSelectValue>[]>(
    () =>
      sprints.map((sprint) => ({
        label: formatSprintSelectOptionLabel(sprint, locale),
        value: String(sprint.id) as SprintSelectValue,
      })),
    [locale, sprints]
  );

  const selectedSprintValue: SprintSelectValue =
    selectedSprintId === null ? '' : (String(selectedSprintId) as SprintSelectValue);
  const triggerPlaceholder = sprints.length > 0 ? placeholder : emptyPlaceholder;

  return (
    <CustomSelect<SprintSelectValue>
      className={className}
      disabled={disabled || sprints.length === 0}
      options={sprintOptions}
      renderTriggerValue={({ selectedOption }) => (
        <span
          className={`min-w-0 truncate whitespace-nowrap${
            selectedOption ? '' : ' text-gray-500 dark:text-gray-400'
          }`}
        >
          {selectedOption?.label ?? triggerPlaceholder}
        </span>
      )}
      searchPlaceholder={searchPlaceholder}
      searchable
      value={selectedSprintValue}
      onChange={(value) => {
        onChange(value ? parseInt(value, 10) : null);
      }}
    />
  );
}
