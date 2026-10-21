'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { Button } from '@/components/Button';
import { customSelectOptionRowClass } from '@/components/customSelectHelpers';
import { Icon } from '@/components/Icon';
import {
  MENU_PANEL_PADDING,
  MENU_ROW,
  MENU_ROW_CHECK,
  MENU_ROW_STACK,
} from '@/features/context-menu/contextMenuClasses';

const SOLID_ROW_CLASS =
  'h-auto min-h-0 w-full !rounded-none border-0 !items-center !justify-start !px-3 !py-2 text-left text-sm font-medium shadow-none';
const GLASS_LIST_CLASS = `min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin-custom ${MENU_PANEL_PADDING} ${MENU_ROW_STACK}`;

interface CustomSelectOptionsListProps<T extends string> {
  filteredOptions: CustomSelectOption<T>[];
  isSearchLoading: boolean;
  searchable: boolean;
  searchEmptyMessage: string;
  searchLoadingMessage: string;
  /** Стекло: строки меню задачи, выбранный — галочкой справа (её рисует список, не `renderOption`). */
  surface: 'glass' | 'solid';
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
  surface,
  value,
  onSelect,
}: CustomSelectOptionsListProps<T>) {
  const isGlass = surface === 'glass';
  const solidListClass = searchable ? 'min-h-0 flex-1 overflow-y-auto' : undefined;
  return (
    <div className={isGlass ? GLASS_LIST_CLASS : solidListClass}>
      {filteredOptions.length === 0 ? (
        <p className={`${isGlass ? 'px-2 py-1.5' : 'px-3 py-2'} text-sm text-gray-500 dark:text-gray-400`}>
          {isSearchLoading ? searchLoadingMessage : searchEmptyMessage}
        </p>
      ) : (
        filteredOptions.map((option) => {
          const isSelected = option.value === value;
          const isOptionDisabled = option.disabled === true;
          const rowClass = isGlass
            ? MENU_ROW
            : `${SOLID_ROW_CLASS} ${customSelectOptionRowClass(isOptionDisabled, isSelected)}`;
          return (
            <Button
              key={String(option.value)}
              aria-current={isSelected || undefined}
              className={rowClass}
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
                <span className={isGlass ? 'min-w-0 flex-1 truncate' : 'block'}>{option.label}</span>
              )}
              {isGlass && isSelected ? <Icon className={`ml-auto ${MENU_ROW_CHECK}`} name="check" /> : null}
            </Button>
          );
        })
      )}
    </div>
  );
}
