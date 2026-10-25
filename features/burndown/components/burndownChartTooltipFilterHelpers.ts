import type { BurndownDayChangelogItem } from './burndownChartTooltipContext';

const SCOPE_EVENT_TYPES = new Set<BurndownDayChangelogItem['type']>([
  'added',
  'removed',
  'closed',
]);

/**
 * Переход закрыл работу — по флагам closesSP/closesTP, которые сервер считает по правилу трекера.
 * `isTP` не задан — закрытие SP или TP.
 */
export function isBurndownChangelogCloseEvent(item: BurndownDayChangelogItem, isTP?: boolean): boolean {
  if (item.type === 'closed') return true;
  if (item.type !== 'status_change') return false;
  if (isTP == null) return item.closesSP === true || item.closesTP === true;
  return isTP ? item.closesTP === true : item.closesSP === true;
}

export function burndownChangelogItemDisplayType(
  item: BurndownDayChangelogItem
): 'added' | 'closed' | 'removed' {
  if (item.type === 'added' || item.type === 'removed') return item.type;
  return 'closed';
}

export function burndownChangelogItemMatchesMetric(
  item: BurndownDayChangelogItem,
  isTP: boolean
): boolean {
  return SCOPE_EVENT_TYPES.has(item.type) || isBurndownChangelogCloseEvent(item, isTP);
}

export function applyBurndownChangelogRemainingDeltas(
  raw: BurndownDayChangelogItem[],
  startRemainingSP: number | undefined,
  startRemainingTP: number | undefined
): BurndownDayChangelogItem[] {
  let prevSP = startRemainingSP;
  let prevTP = startRemainingTP;
  return raw.map((row) => {
    const change = prevSP == null ? row.change : row.remainingSP - prevSP;
    const changeTP = prevTP == null ? row.changeTP : row.remainingTP - prevTP;
    prevSP = row.remainingSP;
    prevTP = row.remainingTP;
    return { ...row, change, changeTP };
  });
}

export function formatBurndownNumericChange(changeVal: number): {
  changeColor: string;
  changeStr: string;
} {
  if (changeVal === 0) {
    return { changeStr: '—', changeColor: '#9ca3af' };
  }
  const changeStr = changeVal > 0 ? `+${changeVal}` : String(changeVal);
  const changeColor = changeVal > 0 ? '#dc2626' : '#16a34a';
  return { changeStr, changeColor };
}
