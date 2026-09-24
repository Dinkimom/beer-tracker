/**
 * Форматирование длительности в формате occupancy (рабочие дни/часы/минуты, 8 ч/день).
 * Суффиксы по умолчанию — русские; таймлайн факта передаёт подписи из словаря.
 */

const WORKING_HOURS_PER_DAY = 8;

interface OccupancyDurationLabels {
  day: string;
  hour: string;
  minute: string;
  zero: string;
}

const DEFAULT_OCCUPANCY_DURATION_LABELS: OccupancyDurationLabels = {
  day: 'д',
  hour: 'ч',
  minute: 'м',
  zero: '0ч',
};

export function formatDuration(
  durationMs: number,
  labels: OccupancyDurationLabels = DEFAULT_OCCUPANCY_DURATION_LABELS
): string {
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const workingDays = Math.floor(hours / WORKING_HOURS_PER_DAY);
  const hoursRem = hours % WORKING_HOURS_PER_DAY;

  const parts: string[] = [];
  if (workingDays > 0) parts.push(`${workingDays}${labels.day}`);
  if (hoursRem > 0) parts.push(`${hoursRem}${labels.hour}`);
  if (workingDays === 0 && hoursRem === 0 && minutes > 0) {
    parts.push(`${minutes}${labels.minute}`);
  }
  return parts.join(' ') || labels.zero;
}
