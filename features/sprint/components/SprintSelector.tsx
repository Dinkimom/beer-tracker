'use client';

import type { SprintListItem } from '@/types/tracker';

import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { customSelectClassHasExplicitWidth } from '@/components/customSelectHelpers';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  compareSprintNamesByNumberDesc,
} from '@/utils/sprintDisplayName';

import { SprintSelectorOptionLabel } from './SprintSelectorOptionLabel';
import { SprintSelectorTriggerContent } from './SprintSelectorTriggerContent';

function sprintSelectorItemTitleClass(isSelected: boolean): string {
  if (isSelected) {
    return 'text-blue-900 dark:text-blue-300';
  }
  return 'text-gray-900 dark:text-gray-100';
}

function sprintSelectorItemDateClass(isSelected: boolean): string {
  if (isSelected) {
    return 'text-blue-700 dark:text-blue-400';
  }
  return 'text-gray-600 dark:text-gray-400';
}

interface SprintSelectorProps {
  className?: string;
  /** true — поповер поверх модалки (z-index выше modal) */
  inModal?: boolean;
  loading?: boolean;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  /** Открыть флоу создания спринта (закрывает поповер). Без колбэка — строки create нет. */
  onCreateSprint?: () => void;
  onSprintChange: (sprintId: number | null) => void;
}

export function SprintSelector({
  className,
  inModal = false,
  sprints,
  selectedSprintId,
  onCreateSprint,
  onSprintChange,
  loading = false,
  sprintsLoading = false,
}: SprintSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const sortedSprints = [...sprints].sort((a, b) =>
    compareSprintNamesByNumberDesc(a.name, b.name)
  );

  const selectedSprint = sortedSprints.find((s) => s.id === selectedSprintId);
  const canCreateSprint = typeof onCreateSprint === 'function';
  const isTriggerDisabled =
    sprintsLoading || loading || (sprints.length === 0 && !canCreateSprint);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const handleSelect = (sprintId: number | null) => {
    onSprintChange(sprintId);
    setIsOpen(false);
  };

  const handleCreateSprint = () => {
    setIsOpen(false);
    onCreateSprint?.();
  };

  // Явный w-* (например w-full в модалке) — растягиваем; иначе ширина = max по пунктам
  const widthClass = customSelectClassHasExplicitWidth(className)
    ? 'min-w-0'
    : 'w-max max-w-full';

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          className={`!h-8 !min-h-0 !justify-between !gap-1.5 !rounded-lg !border-gray-300 !bg-white !px-2.5 !py-0 hover:!border-gray-400 focus-visible:!border-blue-500 focus-visible:!ring-2 focus-visible:!ring-blue-500 data-[state=open]:!border-gray-400 disabled:!cursor-not-allowed dark:!border-gray-600 dark:!bg-gray-700 dark:hover:!border-gray-500 dark:data-[state=open]:!border-gray-500 dark:disabled:!border-gray-600 dark:disabled:!bg-gray-800 ${widthClass} ${className ?? ''}`}
          disabled={isTriggerDisabled}
          type="button"
          variant="outline"
        >
          {/*
            Grid: невидимые копии всех пунктов задают ширину = max(варианты).
            Видимый слой — текущий выбор; смена спринта не меняет размер селекта.
          */}
          <span className="grid max-w-full">
            {sortedSprints.map((sprint) => (
              <span
                key={`measure-${sprint.id}`}
                aria-hidden
                className="pointer-events-none invisible col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap"
              >
                <SprintSelectorOptionLabel
                  dateClassName="text-gray-600 dark:text-gray-400"
                  formatDate={formatDate}
                  sprint={sprint}
                  titleClassName="text-gray-900 dark:text-gray-100"
                />
                <Icon className="h-4 w-4 shrink-0" name="chevron-down" />
              </span>
            ))}
            {canCreateSprint && sortedSprints.length === 0 ? (
              <span
                aria-hidden
                className="pointer-events-none invisible col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="text-sm font-medium">{t('sprint.selector.create')}</span>
                <Icon className="h-4 w-4 shrink-0" name="chevron-down" />
              </span>
            ) : null}
            <span className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-1.5">
              <SprintSelectorTriggerContent
                formatDate={formatDate}
                selectedSprint={selectedSprint}
                sprintsLength={sprints.length}
                sprintsLoading={sprintsLoading}
              />
              <Icon
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                name="chevron-down"
              />
            </span>
          </span>
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg outline-none dark:border-gray-700 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION} ${inModal ? 'z-[2010]' : ZIndex.class('dropdownContent')}`}
          side="bottom"
          sideOffset={4}
          style={{
            width: 'var(--radix-popover-trigger-width)',
            minWidth: 'var(--radix-popover-trigger-width)',
            maxWidth: 'min(100vw - 16px, 24rem)',
          }}
        >
          <div className="flex flex-col">
            {canCreateSprint ? (
              <div className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Button
                  className="h-auto min-h-0 w-full !justify-start cursor-pointer !rounded-none !px-2.5 !py-2.5 text-left shadow-none hover:!bg-gray-50 dark:hover:!bg-gray-700"
                  type="button"
                  variant="ghost"
                  onClick={handleCreateSprint}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <Icon className="h-4 w-4 shrink-0" name="plus" />
                    {t('sprint.selector.create')}
                  </span>
                </Button>
              </div>
            ) : null}
            {sortedSprints.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t('sprint.selector.empty')}
              </div>
            ) : (
              sortedSprints.map((sprint) => {
                const isSelected = sprint.id === selectedSprintId;
                return (
                  <Button
                    key={sprint.id}
                    className={`h-auto min-h-0 w-full !justify-start cursor-pointer !rounded-none border-b border-gray-100 !px-2.5 !py-2.5 text-left shadow-none last:border-b-0 dark:border-gray-700 ${
                      isSelected
                        ? '!border-blue-100 !bg-blue-50 dark:!border-blue-800 dark:!bg-blue-900/30'
                        : 'hover:!bg-gray-50 dark:hover:!bg-gray-700'
                    }`}
                    type="button"
                    variant="ghost"
                    onClick={() => handleSelect(sprint.id)}
                  >
                    <SprintSelectorOptionLabel
                      dateClassName={sprintSelectorItemDateClass(isSelected)}
                      formatDate={formatDate}
                      sprint={sprint}
                      titleClassName={sprintSelectorItemTitleClass(isSelected)}
                    />
                  </Button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
