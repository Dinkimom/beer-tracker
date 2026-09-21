import type { SprintStatus } from '@/types';

import { WORKING_DAYS } from '@/constants';

import {
  addWorkingHoursForDay,
  advanceToMondayFromSaturday,
  advanceToMondayFromSunday,
  advanceToNextWorkdayAfterHours,
  classifyDayStatusFromDiff,
  classifyPartStatusForToday,
  diffDaysFromToday,
  findTodayWorkingDayIndex,
  getFridayEndOfDayFromWeekday,
  getMondayIndexForWeekend,
  getNextWorkingDayFromWeekend,
  isWeekendDate,
  resolveCurrentDayPartIndex,
  resolveMondayPartStatus,
  resolveSprintTimelineWorkingDaysCount as resolveSprintTimelineWorkingDaysCountHelper,
  setDateToWorkdayStart,
  WORKDAY_END_MINUTES,
  WORKDAY_END_MS,
  WORKDAY_START_MS,
} from './dateUtilsHelpers';

/**
 * Проверяет, является ли дата выходным днем (суббота или воскресенье)
 */
export function isWeekend(date: Date): boolean {
  return isWeekendDate(date);
}

/**
 * Получает конец рабочего дня пятницы (18:00) для данной даты
 * Если дата уже в пятницу, возвращает 18:00 этого дня
 * Если дата в субботу или воскресенье, возвращает 18:00 предыдущей пятницы
 */
export function getFridayEndOfDay(date: Date): Date {
  const d = new Date(date);
  const result = getFridayEndOfDayFromWeekday(d, d.getDay());
  return result ?? d;
}

/**
 * Проверяет, полностью ли период находится в выходные дни
 * (и начало, и конец в выходные дни)
 */
export function isFullyOnWeekend(startDate: Date, endDate: Date): boolean {
  return isWeekendDate(startDate) && isWeekendDate(endDate);
}

/**
 * Эффективное начало таймлайна от даты создания задачи.
 * - Выходные → 9:00 понедельника (следующий рабочий день)
 * - После 18:00 рабочего дня → 9:00 следующего дня
 * - Иначе → дата создания как есть
 */
export function getEffectiveTimelineStartFromCreation(createdAt: Date): Date {
  const d = new Date(createdAt);
  const dayOfWeek = d.getDay();
  const totalMinutes = d.getHours() * 60 + d.getMinutes();

  if (dayOfWeek === 6) {
    return advanceToMondayFromSaturday(d);
  }
  if (dayOfWeek === 0) {
    return advanceToMondayFromSunday(d);
  }
  if (totalMinutes >= WORKDAY_END_MINUTES) {
    return advanceToNextWorkdayAfterHours(d, dayOfWeek);
  }
  return d;
}

/**
 * Получает следующий рабочий день после данной даты
 * Если дата в выходной - возвращает следующий понедельник 9:00
 * Если дата в рабочий день, но после 18:00 - возвращает следующий рабочий день 9:00
 * Если дата в рабочий день до 17:00 - возвращает эту дату с началом рабочего дня (9:00)
 */
export function getNextWorkingDay(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const totalMinutes = d.getHours() * 60 + d.getMinutes();

  const fromWeekend = getNextWorkingDayFromWeekend(d, dayOfWeek);
  if (fromWeekend) {
    return fromWeekend;
  }

  if (totalMinutes >= WORKDAY_END_MINUTES) {
    return advanceToNextWorkdayAfterHours(d, dayOfWeek);
  }

  return setDateToWorkdayStart(d);
}

/**
 * Вычисляет рабочее время в миллисекундах между двумя моментами.
 * Учитываются только пн–пт и часы 9:00–18:00 (9 часов в день, по локальному времени).
 */
export function getWorkingHoursBetween(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;

  let total = 0;
  const startDateOnly = new Date(startMs);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endMs);
  endDateOnly.setHours(0, 0, 0, 0);

  const current = new Date(startDateOnly);

  while (current.getTime() <= endDateOnly.getTime()) {
    if (isWeekendDate(current)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dayStartMs = current.getTime() + WORKDAY_START_MS;
    const dayEndMs = current.getTime() + WORKDAY_END_MS;
    total = addWorkingHoursForDay(total, startMs, endMs, dayStartMs, dayEndMs);
    current.setDate(current.getDate() + 1);
  }

  return total;
}

/**
 * Вычисляет календарную дату для dayIndex в мультиспринтовой сетке.
 * Каждый спринт = 10 рабочих дней = 2 недели = 14 календарных дней.
 * dayIndex 0-4: неделя 1 спринта 0; 5-9: неделя 2; 10-14: неделя 1 спринта 1; и т.д.
 */
function getDateForDayIndex(sprintStartDate: Date, dayIndex: number): Date {
  const sprintIdx = Math.floor(dayIndex / 10);
  const dayInSprint = dayIndex % 10;
  const sprintCalendarOffset = sprintIdx * 14;

  const dayDate = new Date(sprintStartDate);
  dayDate.setDate(sprintStartDate.getDate() + sprintCalendarOffset);
  if (dayInSprint < 5) {
    dayDate.setDate(dayDate.getDate() + dayInSprint);
  } else {
    dayDate.setDate(dayDate.getDate() + 5 + 2 + (dayInSprint - 5));
  }
  dayDate.setHours(0, 0, 0, 0);
  return dayDate;
}

export function isTodaySprintFirstWeekMonday(
  sprintStartDateStr: string,
  now: Date = new Date()
): boolean {
  const part = sprintStartDateStr.split('T')[0];
  const seg = part.split('-').map(Number);
  if (seg.length !== 3 || seg.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = seg;
  const sprintStart = new Date(y, m - 1, d);
  sprintStart.setHours(0, 0, 0, 0);
  const firstWeekMonday = getDateForDayIndex(sprintStart, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (today.getDay() !== 1) return false;
  return today.getTime() === firstWeekMonday.getTime();
}

export function countWorkingDaysInclusiveCalendarRange(start: Date, end: Date): number {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (e.getTime() < s.getTime()) return 0;

  let count = 0;
  const cursor = new Date(s);
  while (cursor.getTime() <= e.getTime()) {
    if (!isWeekendDate(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Длина таймлайна спринта в рабочих днях по датам из API; при отсутствии данных — fallback (10).
 */
export function resolveSprintTimelineWorkingDaysCount(
  startStr?: string | null,
  endStr?: string | null,
  fallback: number = WORKING_DAYS
): number {
  return resolveSprintTimelineWorkingDaysCountHelper(
    startStr,
    endStr,
    fallback,
    countWorkingDaysInclusiveCalendarRange
  );
}

/**
 * Получает статус дня относительно текущей даты
 * @param workingDaysCount — число рабочих колонок таймлайна (по длительности спринта или нескольких спринтов)
 */
export function getDayStatus(
  dayIndex: number,
  sprintStartDate?: Date,
  workingDaysCount: number = WORKING_DAYS
): SprintStatus | 'today' {
  if (!sprintStartDate) return 'future';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mondayIndex = getMondayIndexForWeekend(
    sprintStartDate,
    workingDaysCount,
    getWorkingDaysRange,
    isWeekend
  );
  if (mondayIndex !== null && dayIndex === mondayIndex) {
    return 'today';
  }

  const count = Math.max(1, workingDaysCount);
  const range = getWorkingDaysRange(sprintStartDate, count);
  const dayDate = range[dayIndex] ?? range[range.length - 1];
  if (!dayDate) return 'future';

  return classifyDayStatusFromDiff(diffDaysFromToday(dayDate, today));
}

/**
 * Вычисляет дату начала спринта (понедельник текущей недели)
 */
export function getSprintStartDate(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Возвращает массив из count рабочих дней (пн–пт), начиная с startDate.
 * Для мультиспринта: один диапазон для одного запроса isdayoff.
 */
export function getWorkingDaysRange(startDate: Date, count: number): Date[] {
  const days: Date[] = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < count) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(new Date(d));
      added++;
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Получает статус сегмента времени в текущем дне
 * @param dayIndex - индекс дня в спринте
 * @param partIndex - индекс части дня (0, 1, 2)
 * @param sprintStartDate - дата начала спринта
 */
export function getPartStatus(
  dayIndex: number,
  partIndex: number,
  sprintStartDate: Date,
  workingDaysCount: number = WORKING_DAYS
): SprintStatus {
  const status = getDayStatus(dayIndex, sprintStartDate, workingDaysCount);

  if (status === 'past') return 'past';
  if (status === 'future') return 'future';

  const mondayIndex = getMondayIndexForWeekend(
    sprintStartDate,
    workingDaysCount,
    getWorkingDaysRange,
    isWeekend
  );
  const mondayPartStatus = resolveMondayPartStatus(mondayIndex, dayIndex, partIndex);
  if (mondayPartStatus) {
    return mondayPartStatus;
  }

  const now = new Date();
  const currentPart = resolveCurrentDayPartIndex(now.getHours(), now.getMinutes());
  return classifyPartStatusForToday(partIndex, currentPart);
}

/**
 * Вычисляет текущую позицию в спринте (в ячейках)
 * @param sprintStartDate - дата начала спринта
 * @param partsPerDay - количество частей в дне
 */
export function getCurrentSprintCell(
  sprintStartDate: Date,
  partsPerDay: number = 3,
  workingDaysCount: number = WORKING_DAYS
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mondayIndex = getMondayIndexForWeekend(
    sprintStartDate,
    workingDaysCount,
    getWorkingDaysRange,
    isWeekend
  );
  if (mondayIndex !== null) {
    return mondayIndex * partsPerDay;
  }

  const count = Math.max(1, workingDaysCount);
  const range = getWorkingDaysRange(sprintStartDate, count);
  const workingDayIndex = findTodayWorkingDayIndex(range, today);

  if (workingDayIndex >= 0 && workingDayIndex < count) {
    const now = new Date();
    const currentPart = resolveCurrentDayPartIndex(now.getHours(), now.getMinutes());
    return workingDayIndex * partsPerDay + currentPart;
  }

  const firstDay = new Date(sprintStartDate);
  firstDay.setHours(0, 0, 0, 0);
  if (today.getTime() < firstDay.getTime()) return 0;

  return count * partsPerDay;
}
