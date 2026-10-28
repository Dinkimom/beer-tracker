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

  it('marks carriedOver on closed sprint only when the issue is not done by the canon', () => {
    const base = {
      inSprint: true,
      issueFound: true,
      position: { duration: 2, plannedDuration: 2 },
      sprintStatus: 'closed',
      trackerIssuesLoaded: true,
    };
    expect(buildPlanVsActual({ ...base, issueCompleted: true }).carriedOver).toBeUndefined();
    expect(buildPlanVsActual({ ...base, issueCompleted: false }).carriedOver).toBe(true);
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
