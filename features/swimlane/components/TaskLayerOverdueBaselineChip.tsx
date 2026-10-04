'use client';

import type { CSSProperties } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState } from 'react';

import { customSelectPopoverStyle } from '@/components/customSelectHelpers';
import { CustomSelectMenu } from '@/components/CustomSelectMenu';
import { Icon } from '@/components/Icon';
import { CARD_MARGIN, ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  formatOverdueDayAmount,
  isStrongOverdue,
  resolveOverdueKind,
} from '@/features/swimlane/utils/overdueBaselineSummary';

interface TaskLayerOverdueBaselineChipProps {
  baselineHeight: number;
  baselineTop: number;
  canExtend: boolean;
  cells: number;
  isDark: boolean;
  open: boolean;
  partsPerDay: number;
  startCell: number;
  status: string | undefined;
  taskId: string;
  timelineTotalParts: number;
  onCloseAndCreate?: () => Promise<void> | void;
  onExtend?: () => void;
  onOpenChange: (open: boolean) => void;
}

type OverdueMenuAction = '' | 'closeAndCreate' | 'extend';

function overdueTriggerClass(isDark: boolean, strong: boolean, open: boolean): string {
  const pressed = open ? 'brightness-110' : '';
  if (isDark && strong) {
    return `bg-red-600 text-white shadow-sm ring-1 ring-red-300/80 hover:bg-red-500 ${pressed}`;
  }
  if (isDark) {
    return `bg-red-950 text-red-100 shadow-sm ring-1 ring-red-400/80 hover:bg-red-900 ${pressed}`;
  }
  if (strong) return `bg-red-600 text-white shadow-sm hover:bg-red-700 ${pressed}`;
  return `border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 ${pressed}`;
}

export function TaskLayerOverdueBaselineChip({
  baselineHeight,
  baselineTop,
  canExtend,
  cells,
  isDark,
  onCloseAndCreate,
  onExtend,
  onOpenChange,
  open,
  partsPerDay,
  startCell,
  status,
  taskId,
  timelineTotalParts,
}: TaskLayerOverdueBaselineChipProps) {
  const { language, t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  if (timelineTotalParts <= 0 || cells <= 0) return null;

  const days = formatOverdueDayAmount(cells, partsPerDay, language === 'ru' ? ',' : '.');
  const kind = resolveOverdueKind(status);
  const strong = isStrongOverdue(cells, partsPerDay);
  const hint = t(
    kind === 'notStarted'
      ? 'sprintPlanner.swimlane.overdue.notStartedHint'
      : 'sprintPlanner.swimlane.overdue.slippingHint',
    { days }
  );
  const endPercent = ((startCell + cells) / timelineTotalParts) * 100;
  const anchorStyle: CSSProperties = {
    left: `calc(${endPercent}% - ${CARD_MARGIN + 4}px)`,
    top: `${baselineTop + baselineHeight / 2}px`,
    transform: 'translate(-100%, -50%)',
    zIndex: ZIndex.stickyElevated,
  };
  const showExtend = canExtend && onExtend != null;
  const showClose = onCloseAndCreate != null;
  const menuOptions = [
    showExtend
      ? { disabled: pending, label: t('sprintPlanner.swimlane.overdue.extend'), value: 'extend' as const }
      : null,
    showClose
      ? {
          disabled: pending,
          label: t('sprintPlanner.swimlane.overdue.closeAndCreate'),
          value: 'closeAndCreate' as const,
        }
      : null,
  ].filter((option) => option != null);

  const handleCloseAndCreate = () => {
    if (!onCloseAndCreate || pending) return;
    setPending(true);
    Promise.resolve(onCloseAndCreate())
      .finally(() => {
        setPending(false);
        onOpenChange(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to close overdue task and create the next one', error);
      });
  };

  return (
    <Popover.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <div className="pointer-events-auto absolute" data-task-id={taskId} style={anchorStyle}>
        <Popover.Trigger asChild>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={t('sprintPlanner.swimlane.overdue.menuAria', { days })}
            className={`inline-flex h-7 min-w-[7.25rem] cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold leading-none whitespace-nowrap transition-colors ${overdueTriggerClass(isDark, strong, open)}`}
            title={hint}
            type="button"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {t('sprintPlanner.swimlane.overdue.trigger', { days })}
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" name="chevron-down" />
          </button>
        </Popover.Trigger>
        <CustomSelectMenu<OverdueMenuAction>
          align="end"
          filteredOptions={menuOptions}
          isSearchLoading={false}
          popoverStyle={customSelectPopoverStyle(true, ZIndex.popupContent, undefined, undefined)}
          searchEmptyMessage=""
          searchInputRef={searchInputRef}
          searchLoadingMessage=""
          searchPlaceholder=""
          searchQuery=""
          searchable={false}
          setSearchQuery={() => undefined}
          value=""
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
          onSelect={(action) => {
            if (action === 'extend' && onExtend) {
              onOpenChange(false);
              onExtend();
              return;
            }
            if (action === 'closeAndCreate') {
              handleCloseAndCreate();
            }
          }}
        />
      </div>
    </Popover.Root>
  );
}
