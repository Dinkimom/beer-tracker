'use client';

import type { CSSProperties } from 'react';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState } from 'react';

import { customSelectPopoverStyle } from '@/components/customSelectHelpers';
import { CustomSelectMenu } from '@/components/CustomSelectMenu';
import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { CARD_MARGIN, ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  formatOverdueDayAmount,
  resolveOverdueKind,
} from '@/features/swimlane/utils/overdueBaselineSummary';

interface TaskLayerOverdueBaselineChipProps {
  baselineHeight: number;
  baselineTop: number;
  canExtend: boolean;
  cells: number;
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

function overdueChevronClass(open: boolean): string {
  const shown = 'ml-0.5 w-3 opacity-100';
  if (open) return `${shown} rotate-180`;
  return `w-0 opacity-0 group-hover:ml-0.5 group-hover:w-3 group-hover:opacity-100`;
}

export function TaskLayerOverdueBaselineChip({
  baselineHeight,
  baselineTop,
  canExtend,
  cells,
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
        <TextTooltip content={hint}>
        <Popover.Trigger asChild>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={t('sprintPlanner.swimlane.overdue.menuAria', { days })}
            className="group inline-flex cursor-pointer items-center text-xs font-medium leading-none whitespace-nowrap text-red-900 transition-all duration-200 hover:text-red-950 active:scale-[0.98] dark:text-red-100 dark:hover:text-white"
            type="button"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {t('sprintPlanner.swimlane.overdue.trigger', { days })}
            <span className={`inline-flex overflow-hidden transition-all duration-200 ${overdueChevronClass(open)}`}>
              <Icon className="h-3 w-3 shrink-0" name="chevron-down" />
            </span>
          </button>
        </Popover.Trigger>
        </TextTooltip>
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
