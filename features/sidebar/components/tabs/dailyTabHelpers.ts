import { WORKING_DAYS } from '@/constants';
import { getWorkingDaysRange, resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

export function resolveDailyTabSprintDays(
  startDateStr: string,
  endDateStr?: string | null
): Date[] {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const workingDaysCount = resolveSprintTimelineWorkingDaysCount(
    startDateStr,
    endDateStr,
    WORKING_DAYS
  );
  return getWorkingDaysRange(start, workingDaysCount);
}

export function resolveDefaultDayIndex(sprintDays: Date[]): number {
  if (sprintDays.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayIndex = 0; dayIndex < sprintDays.length; dayIndex += 1) {
    const dayDate = sprintDays[dayIndex]!;
    if (isSameCalendarDay(dayDate, today)) {
      return dayIndex;
    }
  }

  const firstDay = sprintDays[0]!;
  const lastDay = sprintDays[sprintDays.length - 1]!;
  if (today.getTime() > lastDay.getTime()) {
    return sprintDays.length - 1;
  }
  if (today.getTime() < firstDay.getTime()) {
    return 0;
  }
  return 0;
}

export function formatDailyTabDayLabel(date: Date, locale: string): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${weekday} ${day}.${month}`;
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

type DailyDayPickerKey = 'ArrowLeft' | 'ArrowRight' | 'End' | 'Home';

export function resolveNextDayIndexFromKey(
  currentIndex: number,
  key: DailyDayPickerKey,
  workingDaysCount: number
): number {
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return workingDaysCount - 1;
  }
  if (key === 'ArrowLeft') {
    return Math.max(0, currentIndex - 1);
  }
  return Math.min(workingDaysCount - 1, currentIndex + 1);
}

export function isDailyDayPickerNavigationKey(key: string): key is DailyDayPickerKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End';
}

const DAILY_DAY_BUTTON_BASE =
  'relative inline-flex min-w-[3.25rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-md px-2 py-1.5 text-xs leading-none transition-colors';

export function resolveDailyDayButtonClassName({
  hasNote,
  isActive,
  isToday,
}: {
  hasNote: boolean;
  isActive: boolean;
  isToday: boolean;
}): string {
  if (isActive) {
    return `${DAILY_DAY_BUTTON_BASE} bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-50`;
  }

  let classes = `${DAILY_DAY_BUTTON_BASE} text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200`;
  if (hasNote) {
    classes += ' font-medium text-gray-800 dark:text-gray-200';
  }
  if (isToday) {
    classes += ' ring-1 ring-inset ring-blue-500/45 dark:ring-blue-400/40';
  }
  return classes;
}

export function resolveDailyDayNoteMarkerClassName({
  hasNote,
  isActive,
}: {
  hasNote: boolean;
  isActive: boolean;
}): string {
  if (!hasNote) {
    return 'mt-1 h-0.5 w-5 rounded-full bg-transparent';
  }
  if (isActive) {
    return 'mt-1 h-0.5 w-5 rounded-full bg-blue-500 dark:bg-blue-400';
  }
  return 'mt-1 h-0.5 w-5 rounded-full bg-blue-500/70 dark:bg-blue-400/75';
}

export function resolveDailyDayAriaLabel({
  dateLabel,
  hasNote,
  isToday,
  labels,
}: {
  dateLabel: string;
  hasNote: boolean;
  isToday: boolean;
  labels: {
    todayWithNote: string;
    withNote: string;
    today: string;
  };
}): string {
  if (hasNote && isToday) {
    return labels.todayWithNote;
  }
  if (hasNote) {
    return labels.withNote;
  }
  if (isToday) {
    return labels.today;
  }
  return dateLabel;
}
