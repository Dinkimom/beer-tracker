'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { DailyTabDayPicker } from '@/features/sidebar/components/tabs/DailyTabDayPicker';
import {
  formatDailyTabDayLabel,
  resolveDefaultDayIndex,
} from '@/features/sidebar/components/tabs/dailyTabHelpers';
import { useSprintDailyNotesStorage } from '@/hooks/localStorage/useSprintDailyNotesStorage';

const NOTE_TEXTAREA_CLASS =
  'min-h-0 flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200/80 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-500 dark:focus:bg-gray-900/70 dark:focus:ring-gray-700/60';

interface DailyTabContentProps {
  selectedSprintId: number;
  sprintDays: Date[];
}

export function DailyTabContent({ selectedSprintId, sprintDays }: DailyTabContentProps) {
  const { language, t } = useI18n();
  const { getNoteForDay, notes, setNoteForDay } = useSprintDailyNotesStorage(selectedSprintId);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => resolveDefaultDayIndex(sprintDays));
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const safeDayIndex = Math.min(selectedDayIndex, Math.max(0, sprintDays.length - 1));
  const selectedDayDate = sprintDays[safeDayIndex] ?? today;
  const notePanelId = 'sidebar-daily-note-panel';
  const noteText = getNoteForDay(safeDayIndex);

  useEffect(() => {
    const textarea = noteTextareaRef.current;
    if (!textarea) {
      return;
    }
    requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
    });
  }, [safeDayIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <DailyTabDayPicker
          locale={locale}
          notePanelId={notePanelId}
          notes={notes}
          selectedDayIndex={safeDayIndex}
          sprintDays={sprintDays}
          today={today}
          onSelectDay={setSelectedDayIndex}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <textarea
          ref={noteTextareaRef}
          aria-label={t('sidebar.dailyTab.noteLabel', {
            date: formatDailyTabDayLabel(selectedDayDate, locale),
          })}
          className={NOTE_TEXTAREA_CLASS}
          id={notePanelId}
          placeholder={t('sidebar.dailyTab.placeholder')}
          role="tabpanel"
          spellCheck
          tabIndex={0}
          value={noteText}
          onChange={(event) => setNoteForDay(safeDayIndex, event.target.value)}
        />
        <p className="mt-2 flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
          {t('sidebar.dailyTab.localOnlyHint')}
        </p>
      </div>
    </div>
  );
}
