import type { ClassifiedSlaBug, SlaBugSection } from './types';

import { hasAnyGrowth } from './classifySlaBugSectionHelpers';
import { DEFAULT_SLA_BUG_THRESHOLDS } from './config';
import { hasFreshActivity } from './slaBugMetrics';

function isTakeNowStrongSignal(bug: ClassifiedSlaBug): boolean {
  const meta = bug.sortMeta;
  if (meta.sharpGrowth24h || meta.strongGrowth7d) {
    return true;
  }
  if (
    bug.input.priority === 'P3' &&
    meta.daysToSla != null &&
    meta.daysToSla <= DEFAULT_SLA_BUG_THRESHOLDS.p3SlaTakeNowDays &&
    bug.input.hdCount >= DEFAULT_SLA_BUG_THRESHOLDS.p3SlaActivityHdMin &&
    hasFreshActivity(bug.input)
  ) {
    return true;
  }
  return meta.closeToUpgrade && meta.hasFreshGrowth7d;
}

function bothHighPriority(ma: ClassifiedSlaBug['sortMeta'], mb: ClassifiedSlaBug['sortMeta']): boolean {
  return ma.priorityRank <= 2 && mb.priorityRank <= 2;
}

function highPriorityBeatsLow(
  highRank: number,
  lowRank: number,
  lowStrong: boolean,
): number | null {
  if (highRank <= 2 && !lowStrong && lowRank >= 3) {
    return -1;
  }
  return null;
}

function strongSignalOverridesRank(
  strong: boolean,
  otherStrong: boolean,
  strongRank: number,
  otherRank: number,
): number | null {
  if (strong && !otherStrong && strongRank > otherRank) {
    return -1;
  }
  return null;
}

function resolveStrongSignalPriority(
  aStrong: boolean,
  bStrong: boolean,
  aRank: number,
  bRank: number,
): number | null {
  const aWins = strongSignalOverridesRank(aStrong, bStrong, aRank, bRank);
  if (aWins != null) {
    return aWins;
  }
  return strongSignalOverridesRank(bStrong, aStrong, bRank, aRank);
}

function compareUnequalTakeNowRanks(
  ma: ClassifiedSlaBug['sortMeta'],
  mb: ClassifiedSlaBug['sortMeta'],
  aStrong: boolean,
  bStrong: boolean,
): number {
  if (bothHighPriority(ma, mb)) {
    return ma.priorityRank - mb.priorityRank;
  }
  const aBeatsB = highPriorityBeatsLow(ma.priorityRank, mb.priorityRank, bStrong);
  if (aBeatsB != null) {
    return aBeatsB;
  }
  const bBeatsA = highPriorityBeatsLow(mb.priorityRank, ma.priorityRank, aStrong);
  if (bBeatsA != null) {
    return 1;
  }
  const strongCmp = resolveStrongSignalPriority(aStrong, bStrong, ma.priorityRank, mb.priorityRank);
  if (strongCmp != null) {
    return strongCmp;
  }
  return ma.priorityRank - mb.priorityRank;
}

function compareTakeNowPriorityRank(
  a: ClassifiedSlaBug,
  b: ClassifiedSlaBug,
  aStrong: boolean,
  bStrong: boolean,
): number | null {
  const ma = a.sortMeta;
  const mb = b.sortMeta;
  if (ma.priorityRank === mb.priorityRank) {
    return null;
  }
  return compareUnequalTakeNowRanks(ma, mb, aStrong, bStrong);
}

function compareTakeNow(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number {
  const ma = a.sortMeta;
  const mb = b.sortMeta;
  const aStrong = isTakeNowStrongSignal(a);
  const bStrong = isTakeNowStrongSignal(b);

  const priorityCmp = compareTakeNowPriorityRank(a, b, aStrong, bStrong);
  if (priorityCmp != null && priorityCmp !== 0) {
    return priorityCmp;
  }

  if (ma.hdCount !== mb.hdCount) {
    return mb.hdCount - ma.hdCount;
  }

  const slaA = ma.daysToSla ?? Number.POSITIVE_INFINITY;
  const slaB = mb.daysToSla ?? Number.POSITIVE_INFINITY;
  return slaA - slaB;
}

function compareBooleanDesc(a: boolean, b: boolean): number | null {
  if (a === b) {
    return null;
  }
  return a ? -1 : 1;
}

function compareNumberDesc(a: number, b: number): number | null {
  if (a === b) {
    return null;
  }
  return b - a;
}

function compareWatch(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number {
  const closeCmp = compareBooleanDesc(a.sortMeta.closeToUpgrade, b.sortMeta.closeToUpgrade);
  if (closeCmp != null) return closeCmp;

  const growth24Cmp = compareNumberDesc(a.input.hdGrowth24h, b.input.hdGrowth24h);
  if (growth24Cmp != null) return growth24Cmp;

  const growth7Cmp = compareNumberDesc(a.input.hdGrowth7d, b.input.hdGrowth7d);
  if (growth7Cmp != null) return growth7Cmp;

  const keyClientCmp = compareBooleanDesc(a.input.keyClient, b.input.keyClient);
  if (keyClientCmp != null) return keyClientCmp;

  const supPriorityCmp = compareBooleanDesc(a.sortMeta.supPriority, b.sortMeta.supPriority);
  if (supPriorityCmp != null) return supPriorityCmp;

  return b.sortMeta.hdCount - a.sortMeta.hdCount;
}

function compareZeroHdCountPreference(aHdCount: number, bHdCount: number): number | null {
  if (aHdCount === 0 && bHdCount > 0) return 1;
  if (bHdCount === 0 && aHdCount > 0) return -1;
  return null;
}

function compareRegular(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number {
  if (a.sortMeta.priorityRank !== b.sortMeta.priorityRank) {
    return a.sortMeta.priorityRank - b.sortMeta.priorityRank;
  }
  if (a.sortMeta.hdCount !== b.sortMeta.hdCount) {
    return b.sortMeta.hdCount - a.sortMeta.hdCount;
  }
  const slaA = a.sortMeta.daysToSla ?? Number.POSITIVE_INFINITY;
  const slaB = b.sortMeta.daysToSla ?? Number.POSITIVE_INFINITY;
  if (slaA !== slaB) {
    return slaA - slaB;
  }
  const zeroHdCmp = compareZeroHdCountPreference(a.input.hdCount, b.input.hdCount);
  return zeroHdCmp ?? 0;
}

function compareReviewLabelPriority(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number | null {
  const aClose = a.primaryLabel === 'close_p4';
  const bClose = b.primaryLabel === 'close_p4';
  const closeCmp = compareBooleanDesc(aClose, bClose);
  if (closeCmp != null) return closeCmp;

  const aDemote = a.primaryLabel === 'demote';
  const bDemote = b.primaryLabel === 'demote';
  return compareBooleanDesc(aDemote, bDemote);
}

function compareGrowthPresence(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number | null {
  if (!hasAnyGrowth(a.input) && hasAnyGrowth(b.input)) return -1;
  if (!hasAnyGrowth(b.input) && hasAnyGrowth(a.input)) return 1;
  return null;
}

function compareReview(a: ClassifiedSlaBug, b: ClassifiedSlaBug): number {
  const labelCmp = compareReviewLabelPriority(a, b);
  if (labelCmp != null) return labelCmp;

  const overdueCmp = compareBooleanDesc(a.sortMeta.isLongOverdue, b.sortMeta.isLongOverdue);
  if (overdueCmp != null) return overdueCmp;

  const overdueDaysCmp = compareNumberDesc(a.sortMeta.overdueDays, b.sortMeta.overdueDays);
  if (overdueDaysCmp != null) return overdueDaysCmp;

  if (a.input.hdCount !== b.input.hdCount) {
    return a.input.hdCount - b.input.hdCount;
  }
  return compareGrowthPresence(a, b) ?? 0;
}

export function sortSection(section: SlaBugSection, items: ClassifiedSlaBug[]): ClassifiedSlaBug[] {
  const copy = [...items];
  if (section === 'take_now') {
    copy.sort(compareTakeNow);
  } else if (section === 'watch') {
    copy.sort(compareWatch);
  } else if (section === 'regular') {
    copy.sort(compareRegular);
  } else {
    copy.sort(compareReview);
  }
  return copy;
}
