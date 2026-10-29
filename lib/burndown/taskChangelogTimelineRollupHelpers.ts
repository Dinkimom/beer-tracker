import type { TaskChangelogTimelineItem } from './taskChangelogTimelineTypes';

export function pushConsolidatedReestimateIfFirst(
  out: TaskChangelogTimelineItem[],
  index: number,
  firstReestimateIndex: number,
  issueKey: string,
  netSP: number,
  netTP: number
): void {
  if (index !== firstReestimateIndex || (netSP === 0 && netTP === 0)) {
    return;
  }
  out.push({ type: 'reestimated', issueKey, deltaSP: netSP, deltaTP: netTP });
}
