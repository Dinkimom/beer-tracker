import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { stampBurndownIssueEstimates } from './stampBurndownIssueEstimates';

function issue(extra: Record<string, unknown>): TrackerIssue {
  return {
    id: '1',
    key: 'RND-1',
    self: '',
    summary: 'Task',
    ...extra,
  } as TrackerIssue;
}

describe('stampBurndownIssueEstimates', () => {
  it('copies embedded dev/qa custom fields onto story and test points', () => {
    const stamped = stampBurndownIssueEstimates(issue({ customfield_10034: 5, customfield_10768: 2 }), {
      configRevision: 1,
      testingFlow: {
        devEstimateFieldId: 'customfield_10034',
        mode: 'embedded_in_dev',
        qaEstimateFieldId: 'customfield_10768',
      },
    });

    expect(stamped.storyPoints).toBe(5);
    expect(stamped.testPoints).toBe(2);
  });

  it('leaves the issue unchanged without a testing flow', () => {
    const original = issue({ storyPoints: 3 });
    expect(stampBurndownIssueEstimates(original, null)).toBe(original);
  });
});
