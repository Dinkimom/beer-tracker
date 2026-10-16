import { describe, expect, it } from 'vitest';

import { buildPlanVsActual, isClosedSprintStatus } from './sprintContextPlanVsActual';

describe('buildPlanVsActual', () => {
  it('uses plannedDuration as planParts and computes slip', () => {
    expect(
      buildPlanVsActual({
        position: { duration: 6, plannedDuration: 4 },
        trackerIssuesLoaded: true,
      })
    ).toEqual({ actualParts: 6, planParts: 4, slippedParts: 2 });
  });

  it('marks carriedOver on closed sprint when issue missing from board', () => {
    expect(
      buildPlanVsActual({
        inSprint: false,
        issueFound: true,
        position: { duration: 2, plannedDuration: 2 },
        sprintStatus: 'closed',
        trackerIssuesLoaded: true,
      }).carriedOver
    ).toBe(true);
  });

  it('skips carriedOver when tracker load failed', () => {
    expect(
      buildPlanVsActual({
        issueFound: false,
        position: { duration: 2, plannedDuration: null },
        sprintStatus: 'closed',
        trackerIssuesLoaded: false,
      }).carriedOver
    ).toBeUndefined();
  });
});

describe('isClosedSprintStatus', () => {
  it('recognizes closed variants', () => {
    expect(isClosedSprintStatus('closed')).toBe(true);
    expect(isClosedSprintStatus('DONE')).toBe(true);
    expect(isClosedSprintStatus('in_progress')).toBe(false);
  });
});
