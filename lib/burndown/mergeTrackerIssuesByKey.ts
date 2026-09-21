import type { TrackerIssue } from '@/types/tracker';

/**
 * Объединяет два списка задач по `key` без дублей.
 * При совпадении ключа побеждает **primary** (например Tracker — актуальные поля с доски).
 *
 * Нужен для burndown: снимки в PG могут отставать или не совпадать по составу спринта с Tracker.
 * Tracker по фильтру спринта даёт текущий состав; merge снижает потерю ключей из‑за рассинхрона.
 */
export function mergeTrackerIssuesByKey(
  primary: TrackerIssue[],
  secondary: TrackerIssue[]
): TrackerIssue[] {
  const map = new Map<string, TrackerIssue>();
  for (const issue of secondary) {
    map.set(issue.key, issue);
  }
  for (const issue of primary) {
    map.set(issue.key, issue);
  }
  return [...map.values()];
}
