/**
 * Утилита для форматирования длительности в TaskTimeline (локализуемые единицы).
 */

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

export function formatTaskTimelineDuration(ms: number, t: TranslateFn): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return hours > 0
      ? t('task.timeline.durationDaysHours', { days, hours })
      : t('task.timeline.durationDays', { days });
  }
  if (hours > 0) {
    return t('task.timeline.durationHours', { hours });
  }
  return t('task.timeline.durationSubHour');
}
