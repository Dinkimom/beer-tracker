'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

import { WORKING_DAYS_PER_WEEK } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  formatDailyTabDayLabel,
  isDailyDayPickerNavigationKey,
  isSameCalendarDay,
  resolveDailyDayButtonClassName,
  resolveDailyDayNoteMarkerClassName,
  resolveDailyDayAriaLabel,
  resolveNextDayIndexFromKey,
} from '@/features/sidebar/components/tabs/dailyTabHelpers';
import { useSidebarTabsScrollFade } from '@/features/sidebar/hooks/useSidebarTabsScrollFade';
import { hasDailyNote, type SprintDailyNotes } from '@/lib/sidebar/sprintDailyNotesStorage';

const FADE_BASE =
  'pointer-events-none absolute inset-y-0 w-8 transition-opacity duration-150';
const FADE_LEFT =
  `${FADE_BASE} left-0 bg-gradient-to-r from-gray-100 from-20% via-gray-100/90 to-transparent dark:from-gray-900/80 dark:via-gray-900/70`;
const FADE_RIGHT =
  `${FADE_BASE} right-0 bg-gradient-to-l from-gray-100 from-20% via-gray-100/90 to-transparent dark:from-gray-900/80 dark:via-gray-900/70`;

interface DailyTabDayPickerProps {
  locale: string;
  notePanelId: string;
  notes: SprintDailyNotes;
  selectedDayIndex: number;
  sprintDays: Date[];
  today: Date;
  onSelectDay: (dayIndex: number) => void;
}

export function DailyTabDayPicker({
  locale,
  notePanelId,
  notes,
  onSelectDay,
  selectedDayIndex,
  sprintDays,
  today,
}: DailyTabDayPickerProps) {
  const { t } = useI18n();
  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const workingDaysCount = sprintDays.length;
  const { scrollRef, showLeft, showRight } = useSidebarTabsScrollFade(
    `${workingDaysCount}-${selectedDayIndex}`
  );

  useEffect(() => {
    dayButtonRefs.current[selectedDayIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedDayIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isDailyDayPickerNavigationKey(event.key)) {
      return;
    }
    event.preventDefault();
    const nextIndex = resolveNextDayIndexFromKey(
      selectedDayIndex,
      event.key,
      workingDaysCount
    );
    if (nextIndex !== selectedDayIndex) {
      onSelectDay(nextIndex);
    }
  };

  return (
    <div className="relative rounded-lg bg-gray-200/70 p-1 dark:bg-gray-900/70">
      <div
        ref={scrollRef}
        aria-label={t('sidebar.dailyTab.dayPickerAria')}
        className="flex flex-nowrap gap-0.5 overflow-x-auto [scrollbar-width:thin]"
        role="tablist"
        onKeyDown={handleKeyDown}
      >
        {sprintDays.map((dayDate, dayIndex) => {
          const isActive = selectedDayIndex === dayIndex;
          const isToday = isSameCalendarDay(dayDate, today);
          const noteFilled = hasDailyNote(notes, dayIndex);
          const showWeekDivider =
            workingDaysCount > WORKING_DAYS_PER_WEEK && dayIndex === WORKING_DAYS_PER_WEEK;
          const dayLabel = formatDailyTabDayLabel(dayDate, locale);
          const ariaLabel = resolveDailyDayAriaLabel({
            dateLabel: dayLabel,
            hasNote: noteFilled,
            isToday,
            labels: {
              today: t('sidebar.dailyTab.dayTodayAria', { date: dayLabel }),
              todayWithNote: t('sidebar.dailyTab.dayTodayWithNoteAria', { date: dayLabel }),
              withNote: t('sidebar.dailyTab.dayWithNoteAria', { date: dayLabel }),
            },
          });

          return (
            <span key={dayIndex} className="contents">
              {showWeekDivider && (
                <span
                  aria-hidden
                  className="mx-0.5 w-px shrink-0 self-stretch bg-gray-300/80 dark:bg-gray-600/80"
                />
              )}
              <button
                ref={(node) => {
                  dayButtonRefs.current[dayIndex] = node;
                }}
                aria-controls={notePanelId}
                aria-label={ariaLabel}
                aria-selected={isActive}
                className={resolveDailyDayButtonClassName({
                  hasNote: noteFilled,
                  isActive,
                  isToday,
                })}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                title={dayLabel}
                type="button"
                onClick={() => onSelectDay(dayIndex)}
              >
                <span>{dayLabel}</span>
                <span
                  aria-hidden
                  className={resolveDailyDayNoteMarkerClassName({
                    hasNote: noteFilled,
                    isActive,
                  })}
                />
              </button>
            </span>
          );
        })}
      </div>
      <div
        aria-hidden
        className={`${FADE_LEFT} ${showLeft ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden
        className={`${FADE_RIGHT} ${showRight ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
