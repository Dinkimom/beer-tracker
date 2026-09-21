import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { mergeTrackerIssuesByKey } from './mergeTrackerIssuesByKey';

function minimalIssue(key: string, summary: string): TrackerIssue {
  return {
    key,
    summary,
  } as TrackerIssue;
}

describe('mergeTrackerIssuesByKey', () => {
  it('dedupes by key and prefers primary', () => {
    const a = mergeTrackerIssuesByKey(
      [minimalIssue('NW-1', 'from tracker')],
      [minimalIssue('NW-1', 'from ch')]
    );
    expect(a).toHaveLength(1);
    expect(a[0]?.summary).toBe('from tracker');
  });

  it('keeps keys only in secondary', () => {
    const a = mergeTrackerIssuesByKey(
      [minimalIssue('NW-1', 'a')],
      [minimalIssue('NW-2', 'b')]
    );
    expect(a.map((i) => i.key).sort()).toEqual(['NW-1', 'NW-2']);
  });
});
