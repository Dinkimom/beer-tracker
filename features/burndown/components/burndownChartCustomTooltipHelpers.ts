import type { BurndownDayChangelogItem } from './burndownChartTooltipContext';

import { applyBurndownChangelogRemainingDeltas } from './burndownChartTooltipFilterHelpers';

interface BurndownTooltipPointPayload {
  date?: string;
  dayChangelog?: BurndownDayChangelogItem[];
  dayStartRemainingSP?: number;
  dayStartRemainingTP?: number;
  fullDate?: string;
  idealSP?: number;
  idealTP?: number;
  remainingSP?: number;
  remainingTP?: number;
}

export function resolveBurndownTooltipDateLabel(
  point: BurndownTooltipPointPayload | undefined,
  locale: string
): string {
  if (!point?.fullDate) {
    return '';
  }
  return new Date(point.fullDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

export function resolveBurndownTooltipDayChangelog(
  point: BurndownTooltipPointPayload | undefined,
  isTP: boolean,
  filterChangelog: (raw: BurndownDayChangelogItem[], isTP: boolean) => BurndownDayChangelogItem[]
): BurndownDayChangelogItem[] {
  const rawChangelog = Array.isArray(point?.dayChangelog) ? point.dayChangelog : [];
  const withDeltas = applyBurndownChangelogRemainingDeltas(
    rawChangelog,
    point?.dayStartRemainingSP,
    point?.dayStartRemainingTP
  );
  return filterChangelog(withDeltas, isTP);
}
