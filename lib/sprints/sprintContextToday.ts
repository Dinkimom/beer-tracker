import type {
  SprintContextCalendarDay,
  SprintContextPosition,
  SprintContextPositionSchedule,
  SprintContextToday,
} from '@/lib/sprints/sprintContextTypes';

/**
 * «Сегодня» относительно сетки спринта: дата (UTC, как у meta.calendarDays), индекс рабочего дня
 * и где сегодня лежит относительно окна спринта.
 *
 * `pivotDay` — первый рабочий день, который ещё не прошёл: в рабочий день это сам сегодняшний индекс,
 * в субботу и воскресенье — индекс понедельника, до спринта — 0, после — число рабочих дней.
 */
export function buildSprintContextToday(
  calendarDays: SprintContextCalendarDay[],
  todayIso: string
): (SprintContextToday & { pivotDay: number }) | null {
  if (calendarDays.length === 0) {
    return null;
  }
  const first = calendarDays[0]!.date;
  const last = calendarDays[calendarDays.length - 1]!.date;
  const exact = calendarDays.find((item) => item.date === todayIso);
  const pivotIndex = calendarDays.findIndex((item) => item.date >= todayIso);
  const pivotDay = pivotIndex === -1 ? calendarDays.length : calendarDays[pivotIndex]!.day;
  let relation: SprintContextToday['relation'] = 'in_sprint';
  if (todayIso < first) {
    relation = 'before_sprint';
  } else if (todayIso > last) {
    relation = 'after_sprint';
  }
  return { date: todayIso, day: exact ? exact.day : null, pivotDay, relation };
}

/** Поле meta.today без служебного pivotDay; нет дат спринта — поля нет. */
export function sprintContextTodayMeta(
  today: ReturnType<typeof buildSprintContextToday>
): { today?: SprintContextToday } {
  return today ? { today: { date: today.date, day: today.day, relation: today.relation } } : {};
}

/** Отрезки позиции в частях от начала спринта: [start, end). Без разреза — одна полоса. */
function positionPartRanges(
  position: Pick<SprintContextPosition, 'duration' | 'segments' | 'startDay' | 'startPart'>,
  partsPerDay: number
): Array<{ end: number; start: number }> {
  const segments =
    position.segments && position.segments.length > 0
      ? position.segments
      : [{ duration: position.duration, startDay: position.startDay, startPart: position.startPart }];
  return segments.map((segment) => {
    const start = segment.startDay * partsPerDay + segment.startPart;
    return { end: start + Math.max(0, segment.duration), start };
  });
}

/**
 * Где задача по плану доски относительно сегодня (день — единица; время суток не учитывается):
 * scheduled — окно впереди, due_today — начинается сегодня, in_window — началась раньше и идёт сейчас,
 * overdue — окно кончилось, а задача не сделана, done — сделана.
 * partsLeft — сколько частей плана осталось с начала сегодняшнего дня;
 * notStartedForDays — задача не начата, а по плану идёт уже столько рабочих дней.
 */
export function buildPositionSchedule(input: {
  /** Сделана по канону «сделано» (`isTaskCompleted`). */
  completed: boolean;
  /** Трекер знает, что задачу ещё не брали в работу. */
  notStarted: boolean;
  partsPerDay: number;
  position: Pick<SprintContextPosition, 'duration' | 'segments' | 'startDay' | 'startPart'>;
  today: { day: number | null; pivotDay: number };
}): SprintContextPositionSchedule {
  const { partsPerDay, position, today } = input;
  const ranges = positionPartRanges(position, partsPerDay);
  const pivotPart = today.pivotDay * partsPerDay;
  const partsLeft = ranges.reduce(
    (sum, range) => sum + Math.max(0, range.end - Math.max(range.start, pivotPart)),
    0
  );
  if (input.completed) {
    return { partsLeft: 0, state: 'done' };
  }
  const start = Math.min(...ranges.map((range) => range.start));
  const startDay = Math.floor(start / partsPerDay);
  if (startDay > today.pivotDay || (startDay === today.pivotDay && today.day == null)) {
    return { partsLeft, state: 'scheduled' };
  }
  if (startDay === today.pivotDay) {
    return { partsLeft, state: 'due_today' };
  }
  const notStartedForDays =
    input.notStarted ? { notStartedForDays: today.pivotDay - startDay } : {};
  return { ...notStartedForDays, partsLeft, state: partsLeft > 0 ? 'in_window' : 'overdue' };
}
