import type { AppLanguage } from '@/lib/i18n/model';

import { formatLocalDateToIsoDateOnly, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

const DUE_DATE_LOCALE: Record<AppLanguage, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
};

interface TaskCardDueDateView {
  isoDate: string;
  label: string;
  overdue: boolean;
}

/** Прошедший срок красный, пока задача не закрыта. Сегодня ещё в норме. */
export function resolveTaskCardDueDate(
  deadline: string | undefined,
  options: { completed: boolean; language: AppLanguage; now?: Date }
): TaskCardDueDateView | null {
  const isoDate = deadlineDateOnly(deadline);
  if (!isoDate || !parseIsoDateOnly(isoDate)) {
    return null;
  }
  const today = formatLocalDateToIsoDateOnly(options.now ?? new Date());
  return {
    isoDate,
    label: formatTaskCardDueDateLabel(isoDate, options.language),
    overdue: !options.completed && isoDate < today,
  };
}

export function formatTaskCardDueDateLabel(isoDate: string, language: AppLanguage): string {
  const parsed = parseIsoDateOnly(isoDate);
  if (!parsed) {
    return isoDate;
  }
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return new Intl.DateTimeFormat(DUE_DATE_LOCALE[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function deadlineDateOnly(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}
