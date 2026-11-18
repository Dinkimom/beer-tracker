'use client';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState } from 'react';

import { Button } from '@/components/Button';
import {
  customSelectOptionRowClass,
  customSelectPopoverStyle,
  resolvePopoverWidth,
} from '@/components/customSelectHelpers';
import { CustomSelectTrigger } from '@/components/CustomSelectTrigger';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

export interface SearchableMultiSelectOption {
  key: string;
  label: string;
  /** Серая пометка справа от названия (например, «из команд»). */
  note?: string;
  selected: boolean;
}

interface SearchableMultiSelectProps {
  disabled?: boolean;
  /** Текст на триггере: выбранное или подсказка, когда ничего не выбрано. */
  displayText: string;
  /** Пустой список без запроса; с запросом — «Ничего не найдено». */
  idleEmptyLabel?: string;
  /** Догружаются данные: строка под списком. */
  loadingLabel?: string;
  /** Строки списка. Без `onQueryChange` компонент сам фильтрует их по запросу. */
  options: readonly SearchableMultiSelectOption[];
  placeholderShown: boolean;
  searchPlaceholder: string;
  title: string;
  onOpen?: () => void;
  /** Запрос уходит наружу (поиск на сервере): `options` уже отфильтрованы вызывающим. */
  onQueryChange?: (query: string) => void;
  onToggle: (key: string) => void;
}

function filterLocally(options: readonly SearchableMultiSelectOption[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (option) => option.label.toLowerCase().includes(q) || option.key.toLowerCase().includes(q)
  );
}

/** Селект с несколькими значениями: поиск сверху, строки с галочкой. Список не закрывается при выборе. */
export function SearchableMultiSelect({
  disabled = false,
  displayText,
  idleEmptyLabel,
  loadingLabel,
  options,
  placeholderShown,
  searchPlaceholder,
  title,
  onOpen,
  onQueryChange,
  onToggle,
}: SearchableMultiSelectProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const changeQuery = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    if (open) {
      changeQuery('');
      onOpen?.();
      const triggerWidth = buttonRef.current?.getBoundingClientRect().width ?? 0;
      setPopoverWidth(resolvePopoverWidth(triggerWidth, false, undefined));
    }
    setIsOpen(open);
  };

  const visible = onQueryChange ? options : filterLocally(options, query);
  const emptyLabel =
    query.trim() || !idleEmptyLabel ? t('common.userSelector.empty') : idleEmptyLabel;

  return (
    <Popover.Root modal={false} open={isOpen && !disabled} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <CustomSelectTrigger
          buttonRef={buttonRef}
          className="w-full"
          disabled={disabled}
          isIconTrigger={false}
          isOpen={isOpen}
          size="default"
          title={title}
          triggerInner={
            <span
              className={`min-w-0 truncate whitespace-nowrap${
                placeholderShown ? ' text-gray-500 dark:text-gray-400' : ''
              }`}
            >
              {displayText}
            </span>
          }
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className={`flex max-h-72 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={12}
          side="bottom"
          sideOffset={4}
          style={customSelectPopoverStyle(false, ZIndex.modalNested, popoverWidth, popoverWidth)}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              searchInputRef.current?.focus();
            });
          }}
        >
          <div className="shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-600">
            <Input
              ref={searchInputRef}
              autoComplete="off"
              placeholder={searchPlaceholder}
              size="sm"
              type="search"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
            ) : (
              visible.map((option) => (
                <Button
                  key={option.key}
                  aria-pressed={option.selected}
                  className={`h-auto min-h-0 w-full !items-center !justify-start !rounded-none border-0 !px-3 !py-2 text-left text-sm font-medium shadow-none ${customSelectOptionRowClass(false, option.selected)}`}
                  variant="ghost"
                  onClick={() => onToggle(option.key)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        option.selected ? 'text-blue-600 dark:text-blue-400' : 'text-transparent'
                      }`}
                      name="check"
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                    {option.note ? (
                      <span className="shrink-0 text-xs font-normal text-gray-500 dark:text-gray-400">
                        {option.note}
                      </span>
                    ) : null}
                  </span>
                </Button>
              ))
            )}
            {loadingLabel ? (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{loadingLabel}</p>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
