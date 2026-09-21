/**
 * Форматирование длительности в формате occupancy (рабочие дни/часы/минуты, 8 ч/день).
 */

const WORKING_HOURS_PER_DAY = 8;

export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const workingDays = Math.floor(hours / WORKING_HOURS_PER_DAY);
  const hoursRem = hours % WORKING_HOURS_PER_DAY;

  const parts: string[] = [];
  if (workingDays > 0) parts.push(`${workingDays}д`);
  if (hoursRem > 0) parts.push(`${hoursRem}ч`);
  if (workingDays === 0 && hoursRem === 0 && minutes > 0) parts.push(`${minutes}м`);
  return parts.join(' ') || '0ч';
}
