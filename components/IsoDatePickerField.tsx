'use client';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { formatIsoDateRuLongUtc, pad2, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

const WEEKDAYS_MON_FIRST = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

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
  const nowUtc = useMemo(() => {
    const t = new Date();
    return { m: t.getUTCMonth() + 1, y: t.getUTCFullYear() };
  }, []);

  const [todayUtc, setTodayUtc] = useState(() => {
    const t = new Date();
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  });

  const initialView = useMemo(() => {
    const p = value ? parseIsoDateOnly(value) : null;
    return { m: p?.m ?? nowUtc.m, y: p?.y ?? nowUtc.y };
  }, [nowUtc.m, nowUtc.y, value]);

  const [viewY, setViewY] = useState(initialView.y);
  const [viewM, setViewM] = useState(initialView.m);

  useEffect(() => {
    if (!open) return;
    const t = new Date();
    setTodayUtc({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
    const p = value ? parseIsoDateOnly(value) : null;
    if (p) {
      setViewY(p.y);
      setViewM(p.m);
    } else {
      setViewY(nowUtc.y);
      setViewM(nowUtc.m);
    }
  }, [open, nowUtc.m, nowUtc.y, value]);

  const lastDay = new Date(Date.UTC(viewY, viewM, 0)).getUTCDate();
  const firstWeekdayUtc = new Date(Date.UTC(viewY, viewM - 1, 1)).getUTCDay();
  const startPad = (firstWeekdayUtc + 6) % 7;

  const monthTitle = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(viewY, viewM - 1, 1)));

  const goPrevMonth = () => {
    if (viewM <= 1) {
      setViewM(12);
      setViewY((y) => y - 1);
    } else {
      setViewM((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewM >= 12) {
      setViewM(1);
      setViewY((y) => y + 1);
    } else {
      setViewM((m) => m + 1);
    }
  };

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
          <div className="mb-2 flex items-center justify-between gap-1 px-0.5">
            <Button
              aria-label="Предыдущий месяц"
              className="!h-8 !w-8 !min-w-0 shrink-0 !p-0"
              type="button"
              variant="ghost"
              onClick={goPrevMonth}
            >
              <Icon className="h-4 w-4" name="chevron-left" />
            </Button>
            <span className="min-w-0 truncate px-1 text-center text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
              {monthTitle}
            </span>
            <Button
              aria-label="Следующий месяц"
              className="!h-8 !w-8 !min-w-0 shrink-0 !p-0"
              type="button"
              variant="ghost"
              onClick={goNextMonth}
            >
              <Icon className="h-4 w-4" name="chevron-right" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS_MON_FIRST.map((w) => (
              <div
                key={w}
                className="flex h-7 items-center justify-center text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {w}
              </div>
            ))}
            {Array.from({ length: startPad }, (_, i) => (
              <div key={`pad-${i}`} className="h-8" />
            ))}
            {Array.from({ length: lastDay }, (_, i) => {
              const day = i + 1;
              const iso = `${viewY}-${pad2(viewM)}-${pad2(day)}`;
              const selected = value === iso;
              const isToday = viewY === todayUtc.y && viewM === todayUtc.m && day === todayUtc.d;
              return (
                <Button
                  key={iso}
                  className={`!h-8 !min-h-0 !w-full !px-0 !py-0 text-sm font-medium rounded-md ${isoDatePickerDayClasses(selected, isToday)}`}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
