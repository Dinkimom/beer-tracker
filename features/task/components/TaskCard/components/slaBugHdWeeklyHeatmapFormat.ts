import type { AppLanguage } from '@/lib/i18n/model';
import type { HdWeeklyHeatmapWeek } from '@/lib/overseer/hdWeeklyHeatmap';

import { addUtcWeeks } from '@/lib/overseer/hdWeeklyHeatmap';

function formatWeekRangeLabel(weekStart: string, language: AppLanguage): string {
  const startMs = Date.parse(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(startMs)) {
    return weekStart;
  }
  const endMs = Date.parse(`${addUtcWeeks(weekStart, 1)}T00:00:00.000Z`) - 1;
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  const fmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const startLabel = fmt.format(new Date(startMs));
  const endLabel = fmt.format(new Date(endMs));
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} – ${endLabel}`;
}

export function formatWeekDetailLabel(
  week: HdWeeklyHeatmapWeek,
  language: AppLanguage,
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  const range = formatWeekRangeLabel(week.weekStart, language);
  return week.count > 0
    ? t('sidebar.bugsTab.tooltip.heatmapCellCount', { range, count: week.count })
    : t('sidebar.bugsTab.tooltip.heatmapCellEmpty', { range });
}
