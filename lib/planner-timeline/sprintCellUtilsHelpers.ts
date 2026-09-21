function isWeekday(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

type WorkingDayScanStep =
  { type: 'continue'; nextDayIndex: number } | { type: 'found'; index: number };

function stepWorkingDayScan(cursor: Date, targetMs: number, dayIndex: number): WorkingDayScanStep {
  if (!isWeekday(cursor.getDay())) {
    return { type: 'continue', nextDayIndex: dayIndex };
  }
  if (cursor.getTime() === targetMs) {
    return { type: 'found', index: dayIndex };
  }
  return { type: 'continue', nextDayIndex: dayIndex + 1 };
}

export function scanWorkingDayIndexFromStart(
  start: Date,
  targetMs: number,
  workingDaysCount: number
): number {
  let dayIndex = 0;
  const cursor = new Date(start);
  while (dayIndex < workingDaysCount) {
    const step = stepWorkingDayScan(cursor, targetMs, dayIndex);
    if (step.type === 'found') {
      return step.index;
    }
    dayIndex = step.nextDayIndex;
    cursor.setDate(cursor.getDate() + 1);
  }
  return workingDaysCount;
}
