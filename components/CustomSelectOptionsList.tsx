'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { Button } from '@/components/Button';
import { customSelectOptionRowClass } from '@/components/customSelectHelpers';

interface CustomSelectOptionsListProps<T extends string> {
  filteredOptions: CustomSelectOption<T>[];
  isSearchLoading: boolean;
  searchable: boolean;
  searchEmptyMessage: string;
  searchLoadingMessage: string;
  value: T;
  onSelect: (value: T) => void;
  renderOption?: (option: CustomSelectOption<T>, ctx: { isSelected: boolean }) => React.ReactNode;
}

export function CustomSelectOptionsList<T extends string>({
  filteredOptions,
  isSearchLoading,
  renderOption,
  searchEmptyMessage,
  searchLoadingMessage,
  searchable,
  value,
  onSelect,
}: CustomSelectOptionsListProps<T>) {
  return (
    <div className={searchable ? 'min-h-0 flex-1 overflow-y-auto' : undefined}>
      {filteredOptions.length === 0 ? (
        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          {isSearchLoading ? searchLoadingMessage : searchEmptyMessage}
        </p>
      ) : (
        filteredOptions.map((option) => {
          const isSelected = option.value === value;
          const isOptionDisabled = option.disabled === true;
          const rowClass = customSelectOptionRowClass(isOptionDisabled, isSelected);
          return (
            <Button
              key={String(option.value)}
              className={`h-auto min-h-0 w-full !rounded-none border-0 !items-center !justify-start !px-3 !py-2 text-left text-sm font-medium shadow-none ${rowClass}`}
              disabled={isOptionDisabled}
              type="button"
              variant="ghost"
              onClick={() => {
                if (isOptionDisabled) {
                  return;
                }
                onSelect(option.value);
              }}
            >
              {renderOption ? (
                renderOption(option, { isSelected })
              ) : (
                <span className="block">{option.label}</span>
              )}
            </Button>
          );
        })
      )}
    </div>
  );
}
