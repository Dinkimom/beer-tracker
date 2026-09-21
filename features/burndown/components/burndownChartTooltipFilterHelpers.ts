import type { BurndownDayChangelogItem } from './burndownChartTooltipContext';

import { isDoneStatus } from '@/lib/burndown/burndownFromChangelogReplayHelpers';

const SCOPE_EVENT_TYPES = new Set<BurndownDayChangelogItem['type']>([
  'added',
  'removed',
  'closed',
]);

export function isBurndownChangelogCloseEvent(item: BurndownDayChangelogItem): boolean {
  if (item.type === 'closed') return true;
  if (item.type !== 'status_change') return false;
  return isDoneStatus(item.statusToKey) && !isDoneStatus(item.statusFromKey);
}

export function burndownChangelogItemDisplayType(
  item: BurndownDayChangelogItem
): 'added' | 'closed' | 'removed' {
  if (item.type === 'added' || item.type === 'removed') return item.type;
  return 'closed';
}

export function burndownChangelogItemMatchesMetric(
  item: BurndownDayChangelogItem,
  _isTP: boolean
): boolean {
  return SCOPE_EVENT_TYPES.has(item.type) || isBurndownChangelogCloseEvent(item);
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
