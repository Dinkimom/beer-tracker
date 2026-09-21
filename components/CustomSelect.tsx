'use client';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState, type ReactNode } from 'react';

import {
  customSelectDisplayText,
  customSelectPopoverStyle,
  resolvePopoverWidth,
} from '@/components/customSelectHelpers';
import { CustomSelectMenu } from '@/components/CustomSelectMenu';
import { CustomSelectTrigger } from '@/components/CustomSelectTrigger';
import { ZIndex } from '@/constants';

export interface CustomSelectOption<T extends string> {
  disabled?: boolean;
  label: string;
  value: T;
}

function optionMatchesQuery<T extends string>(
  option: CustomSelectOption<T>,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    option.label.toLowerCase().includes(q) || String(option.value).toLowerCase().includes(q)
  );
}

function useCustomSelectOpenState(params: {
  disabled: boolean;
  menuFitContent: boolean;
  menuMinWidth: number | undefined;
  onSearchQueryChange?: (query: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);
  const [popoverMinWidth, setPopoverMinWidth] = useState<number | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (params.disabled) {
      return;
    }
    if (open) {
      setSearchQuery('');
      params.onSearchQueryChange?.('');
      const triggerWidth = buttonRef.current?.getBoundingClientRect().width ?? 0;
      setPopoverMinWidth(triggerWidth);
      setPopoverWidth(resolvePopoverWidth(triggerWidth, params.menuFitContent, params.menuMinWidth));
    }
    setIsOpen(open);
  };

  return {
    buttonRef,
    handleOpenChange,
    isOpen,
    popoverMinWidth,
    popoverWidth,
    searchQuery,
    setSearchQuery,
  };
}

interface CustomSelectProps<T extends string> {
  className?: string;
  disabled?: boolean;
  isSearchLoading?: boolean;
  menuFitContent?: boolean;
  menuMinWidth?: number;
  menuZIndex?: number;
  options: CustomSelectOption<T>[];
  searchable?: boolean;
  searchEmptyMessage?: string;
  searchLoadingMessage?: string;
  searchPlaceholder?: string;
  selectedPrefix?: string;
  size?: 'compact' | 'default';
  title?: string;
  triggerVariant?: 'default' | 'icon';
  value: T;
  onChange: (value: T) => void;
  onSearchQueryChange?: (query: string) => void;
  renderOption?: (option: CustomSelectOption<T>, ctx: { isSelected: boolean }) => ReactNode;
  renderTriggerValue?: (ctx: {
    selectedOption: CustomSelectOption<T> | undefined;
    value: T;
  }) => ReactNode;
}

export function CustomSelect<T extends string>({
  className,
  disabled = false,
  size = 'default',
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder = 'Поиск…',
  isSearchLoading = false,
  searchEmptyMessage = 'Ничего не найдено',
  searchLoadingMessage = '…',
  onSearchQueryChange,
  menuMinWidth,
  menuFitContent = false,
  renderOption,
  renderTriggerValue,
  selectedPrefix,
  title,
  menuZIndex,
  triggerVariant = 'default',
}: CustomSelectProps<T>) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isIconTrigger = triggerVariant === 'icon';
  const {
    buttonRef,
    handleOpenChange,
    isOpen,
    popoverMinWidth,
    popoverWidth,
    searchQuery,
    setSearchQuery,
  } = useCustomSelectOpenState({ disabled, menuFitContent, menuMinWidth, onSearchQueryChange });

  const selectedOption = options.find((o) => o.value === value);
  const displayText = customSelectDisplayText(selectedOption, value, selectedPrefix);
  const isEmptyValue = value === '' || selectedOption?.value === '';
  const triggerInner =
    renderTriggerValue?.({ selectedOption, value }) ?? (
      <span
        className={`min-w-0 truncate whitespace-nowrap${isEmptyValue ? ' text-gray-500 dark:text-gray-400' : ''}`}
      >
        {displayText}
      </span>
    );

  const filteredOptions = searchable
    ? options.filter((o) => optionMatchesQuery(o, searchQuery))
    : options;

  const contentZIndex = menuZIndex ?? ZIndex.modal + 1;
  const popoverStyle = customSelectPopoverStyle(
    menuFitContent,
    contentZIndex,
    popoverWidth,
    popoverMinWidth
  );

  return (
    <Popover.Root modal={false} open={isOpen && !disabled} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <CustomSelectTrigger
          buttonRef={buttonRef}
          className={className}
          disabled={disabled}
          isIconTrigger={isIconTrigger}
          isOpen={isOpen}
          size={size}
          title={title}
          triggerInner={triggerInner}
        />
      </Popover.Trigger>

      <CustomSelectMenu
        filteredOptions={filteredOptions}
        isSearchLoading={isSearchLoading}
        popoverStyle={popoverStyle}
        renderOption={renderOption}
        searchEmptyMessage={searchEmptyMessage}
        searchInputRef={searchInputRef}
        searchLoadingMessage={searchLoadingMessage}
        searchPlaceholder={searchPlaceholder}
        searchQuery={searchQuery}
        searchable={searchable}
        setSearchQuery={setSearchQuery}
        value={value}
        onSearchQueryChange={onSearchQueryChange}
        onSelect={(optionValue) => {
          onChange(optionValue);
          handleOpenChange(false);
        }}
      />
    </Popover.Root>
  );
}
