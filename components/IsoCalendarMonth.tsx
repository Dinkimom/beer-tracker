'use client';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { pad2, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

const WEEKDAYS_MON_FIRST = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function todayIsoUtc(): string {
  const t = new Date();
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

interface IsoCalendarMonthProps {
  /** Месяц, открытый при монтировании; без валидной даты — текущий (UTC). */
  anchorIso: string | null;
  navButtonClassName?: string;
  dayClassName: (iso: string, isToday: boolean) => string;
  onDayPick: (iso: string) => void;
}

/**
 * Месяц календаря ISO-дат (UTC): шапка с переключением месяцев и сетка дней, неделя с понедельника.
 * Монтируется внутри `Popover.Content`, поэтому вид и «сегодня» пересчитываются при каждом открытии.
 */
export function IsoCalendarMonth({
  anchorIso,
  navButtonClassName = '',
  dayClassName,
  onDayPick,
}: IsoCalendarMonthProps) {
  const [today] = useState(todayIsoUtc);
  const [view, setView] = useState(() => {
    const p = (anchorIso && parseIsoDateOnly(anchorIso)) || parseIsoDateOnly(today)!;
    return { m: p.m, y: p.y };
  });

  const lastDay = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const startPad = (new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay() + 6) % 7;
  const monthTitle = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(view.y, view.m - 1, 1)));

  const shiftMonth = (delta: -1 | 1) => {
    setView(({ m, y }) => {
      const index = y * 12 + (m - 1) + delta;
      return { m: (index % 12) + 1, y: Math.floor(index / 12) };
    });
  };

  const navClass = `!h-8 !w-8 !min-w-0 shrink-0 !p-0 ${navButtonClassName}`;

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-1 px-0.5">
        <Button
          aria-label="Предыдущий месяц"
          className={navClass}
          type="button"
          variant="ghost"
          onClick={() => shiftMonth(-1)}
        >
          <Icon className="h-4 w-4" name="chevron-left" />
        </Button>
        <span className="min-w-0 truncate px-1 text-center text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
          {monthTitle}
        </span>
        <Button
          aria-label="Следующий месяц"
          className={navClass}
          type="button"
          variant="ghost"
          onClick={() => shiftMonth(1)}
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
          const iso = `${view.y}-${pad2(view.m)}-${pad2(day)}`;
          return (
            <Button
              key={iso}
              className={`!h-8 !min-h-0 !w-full !px-0 !py-0 text-sm font-medium ${dayClassName(iso, iso === today)}`}
              type="button"
              variant="ghost"
              onClick={() => onDayPick(iso)}
            >
              {day}
            </Button>
          );
        })}
      </div>
    </>
  );
}
