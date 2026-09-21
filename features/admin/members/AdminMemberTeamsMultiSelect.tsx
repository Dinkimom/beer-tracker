'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import {
  customSelectOptionRowClass,
  customSelectPopoverStyle,
  resolvePopoverWidth,
} from '@/components/customSelectHelpers';
import { CustomSelectTrigger } from '@/components/CustomSelectTrigger';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { label, muted } from '@/features/admin/adminUiTokens';

export interface AdminMemberTeamOption {
  id: string;
  title: string;
}

interface AdminMemberTeamsMultiSelectProps {
  disabled?: boolean;
  menuZIndex?: number;
  options: AdminMemberTeamOption[];
  selectedIds: string[];
  onChange: (teamIds: string[]) => void;
}

function toggleTeamId(selectedIds: string[], teamId: string): string[] {
  if (selectedIds.includes(teamId)) {
    return selectedIds.filter((id) => id !== teamId);
  }
  return [...selectedIds, teamId];
}

function teamsMultiSelectDisplayText(
  options: AdminMemberTeamOption[],
  selectedIds: string[],
  emptyLabel: string,
  selectedCountLabel: (count: number) => string
): string {
  if (selectedIds.length === 0) {
    return emptyLabel;
  }
  const titles = selectedIds
    .map((id) => options.find((option) => option.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  if (titles.length === 0) {
    return selectedCountLabel(selectedIds.length);
  }
  if (titles.length <= 2) {
    return titles.join(', ');
  }
  return selectedCountLabel(titles.length);
}

export function AdminMemberTeamsMultiSelect({
  disabled = false,
  menuZIndex,
  onChange,
  options,
  selectedIds,
}: AdminMemberTeamsMultiSelectProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayText = useMemo(
    () =>
      teamsMultiSelectDisplayText(
        options,
        selectedIds,
        t('admin.membersPage.teamsMultiPlaceholder'),
        (count) => t('admin.membersPage.teamsMultiSelectedCount', { count })
      ),
    [options, selectedIds, t]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.title.toLowerCase().includes(q) || option.id.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    if (open) {
      setSearchQuery('');
      const triggerWidth = buttonRef.current?.getBoundingClientRect().width ?? 0;
      setPopoverWidth(resolvePopoverWidth(triggerWidth, false, undefined));
    }
    setIsOpen(open);
  };

  const contentZIndex = menuZIndex ?? ZIndex.modal + 1;
  const popoverStyle = customSelectPopoverStyle(false, contentZIndex, popoverWidth, popoverWidth);

  return (
    <div>
      <span className={label}>{t('admin.membersPage.teamsMultiLabel')}</span>
      {options.length === 0 ? (
        <p className={`mt-1.5 text-xs ${muted}`}>{t('admin.membersPage.teamsMultiEmpty')}</p>
      ) : (
        <>
          <Popover.Root modal={false} open={isOpen && !disabled} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
              <CustomSelectTrigger
                buttonRef={buttonRef}
                className="mt-1.5 w-full"
                disabled={disabled}
                isIconTrigger={false}
                isOpen={isOpen}
                size="default"
                title={t('admin.membersPage.teamsMultiLabel')}
                triggerInner={
                  <span
                    className={`min-w-0 truncate whitespace-nowrap${
                      selectedIds.length === 0 ? ' text-gray-500 dark:text-gray-400' : ''
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
                style={popoverStyle}
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  requestAnimationFrame(() => {
                    searchInputRef.current?.focus();
                  });
                }}
              >
                <div className="shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-600">
                  <input
                    ref={searchInputRef}
                    autoComplete="off"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
                    placeholder={t('admin.membersPage.teamsMultiSearchPlaceholder')}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filteredOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('common.userSelector.empty')}
                    </p>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = selectedIds.includes(option.id);
                      const rowClass = customSelectOptionRowClass(false, isSelected);
                      return (
                        <Button
                          key={option.id}
                          className={`h-auto min-h-0 w-full !items-center !justify-start !rounded-none border-0 !px-3 !py-2 text-left text-sm font-medium shadow-none ${rowClass}`}
                          type="button"
                          variant="ghost"
                          onClick={() => onChange(toggleTeamId(selectedIds, option.id))}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${
                                isSelected
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-transparent'
                              }`}
                              name="check"
                            />
                            <span className="min-w-0 truncate">{option.title}</span>
                          </span>
                        </Button>
                      );
                    })
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('admin.membersPage.teamsMultiHint')}
          </p>
        </>
      )}
    </div>
  );
}
