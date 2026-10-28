'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IsoCalendarMonth } from '@/components/IsoCalendarMonth';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import {
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  FLOATING_MENU_GLASS_SHELL,
  glassLensControlClass,
} from '@/features/context-menu/contextMenuClasses';
import { formatIsoDateRuNumericUtc, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

import {
  draftFromRange,
  isoDateRangeDayClassName,
  resolveIsoDateRangeDayPick,
} from './isoDateRangePickerFieldHelpers';

interface RangeDraft {
  end: string | null;
  start: string | null;
}

interface IsoDateRangePickerFieldProps {
  contentZIndex?: number;
  disabled?: boolean;
  endDate: string;
  placeholder?: string;
  startDate: string;
  /** На стеклянной плашке: триггер — линза, календарь — стеклянная оболочка меню. */
  surface?: 'glass' | 'solid';
  onChange: (range: { endDate: string; startDate: string }) => void;
}

export function IsoDateRangePickerField({
  contentZIndex = ZIndex.modalNested + 2,
  disabled = false,
  endDate,
  placeholder = 'Выберите период',
  startDate,
  surface = 'solid',
  onChange,
}: IsoDateRangePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const isGlass = surface === 'glass';
  const [draft, setDraft] = useState<RangeDraft>(() => draftFromRange(startDate, endDate));

  const anchorIso = useMemo(() => {
    if (parseIsoDateOnly(startDate)) return startDate;
    if (parseIsoDateOnly(endDate)) return endDate;
    return null;
  }, [endDate, startDate]);

  const displayLabel = useMemo(() => {
    if (!parseIsoDateOnly(startDate) || !parseIsoDateOnly(endDate)) return null;
    if (startDate > endDate) return null;
    return `${formatIsoDateRuNumericUtc(startDate)} — ${formatIsoDateRuNumericUtc(endDate)}`;
  }, [endDate, startDate]);

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (next) setDraft(draftFromRange(startDate, endDate));
    setOpen(next);
  };

  const onDayPick = (iso: string) => {
    const result = resolveIsoDateRangeDayPick(iso, draft);
    setDraft(result.next);
    if (result.range) {
      onChange(result.range);
      setOpen(false);
    }
  };

  return (
    <Popover.Root modal={false} open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button
          aria-expanded={open}
          className={`w-full !h-10 !min-h-10 !justify-between !gap-2 !px-3 font-normal ${isGlass ? `!rounded-lg ${glassLensControlClass()}` : ''}`}
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <span
            className={
              displayLabel
                ? 'min-w-0 truncate text-left text-sm text-gray-900 dark:text-gray-100'
                : 'text-left text-sm text-gray-400 dark:text-gray-500'
            }
          >
            {displayLabel ?? placeholder}
          </span>
          <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" name="calendar" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`w-[min(100vw-2rem,288px)] p-2 ${isGlass ? `relative ${FLOATING_MENU_GLASS_SHELL}` : 'rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800'} ${OVERLAY_FLOATING_ANIMATION}`}
          side="bottom"
          sideOffset={6}
          style={{ zIndex: contentZIndex }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <IsoCalendarMonth
            anchorIso={anchorIso}
            dayClassName={(iso, isToday) => isoDateRangeDayClassName(iso, draft, isToday)}
            navButtonClassName={isGlass ? CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER : ''}
            onDayPick={onDayPick}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
