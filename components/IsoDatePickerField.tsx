'use client';

import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IsoCalendarMonth } from '@/components/IsoCalendarMonth';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { formatIsoDateRuLongUtc, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

function isoDatePickerDayClasses(selected: boolean, isToday: boolean): string {
  if (selected) {
    return '!bg-blue-600 !text-white hover:!bg-blue-700 dark:!bg-blue-600 dark:hover:!bg-blue-500';
  }
  if (isToday) {
    return 'text-gray-800 ring-2 ring-inset ring-blue-500 dark:text-gray-100 dark:ring-blue-400 hover:!bg-gray-100 dark:hover:!bg-gray-700';
  }
  return 'text-gray-800 hover:!bg-gray-100 dark:text-gray-100 dark:hover:!bg-gray-700';
}

interface IsoDatePickerFieldProps {
  contentZIndex?: number;
  disabled?: boolean;
  placeholder?: string;
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
}

export function IsoDatePickerField({
  contentZIndex = ZIndex.modalNested + 2,
  disabled = false,
  placeholder = 'Выберите дату',
  value,
  onChange,
}: IsoDatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const displayLabel = value && parseIsoDateOnly(value) ? formatIsoDateRuLongUtc(value) : null;

  return (
    <Popover.Root modal={false} open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <Popover.Trigger asChild>
        <Button
          aria-expanded={open}
          className="w-full !h-10 !min-h-10 !justify-between !gap-2 !px-3 font-normal"
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <span className={displayLabel ? 'text-left text-sm text-gray-900 dark:text-gray-100' : 'text-left text-sm text-gray-400 dark:text-gray-500'}>
            {displayLabel ?? placeholder}
          </span>
          <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" name="calendar" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`w-[min(100vw-2rem,288px)] rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
          side="bottom"
          sideOffset={6}
          style={{ zIndex: contentZIndex }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <IsoCalendarMonth
            anchorIso={value || null}
            dayClassName={(iso, isToday) => `rounded-md ${isoDatePickerDayClasses(value === iso, isToday)}`}
            onDayPick={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
