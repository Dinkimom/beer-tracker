import { describe, expect, it } from 'vitest';

import { resolveAssigneeVelocityReadout } from './assigneeVelocityReadout';

describe('resolveAssigneeVelocityReadout', () => {
  const entry = { averageSp: 4, averageTp: 2.5, spSprintCount: 3, tpSprintCount: 2 };

  it('shows story points for a developer', () => {
    expect(resolveAssigneeVelocityReadout(entry, 'developer')).toEqual({
      points: 4,
      unit: 'sp',
    });
  });

  it('shows test points for a tester', () => {
    expect(resolveAssigneeVelocityReadout(entry, 'tester')).toEqual({
      points: 2.5,
      unit: 'tp',
    });
  });

  it('falls back to story points when a tester has no test-point history', () => {
    expect(
      resolveAssigneeVelocityReadout(
        { averageSp: 4.3, averageTp: null, spSprintCount: 2, tpSprintCount: 0 },
        'tester'
      )
    ).toEqual({ points: 4.3, unit: 'sp' });
  });

  it('falls back to test points when a developer has no story-point history', () => {
    expect(
      resolveAssigneeVelocityReadout(
        { averageSp: null, averageTp: 2, spSprintCount: 0, tpSprintCount: 1 },
        'developer'
      )
    ).toEqual({ points: 2, unit: 'tp' });
  });

  it('hides the number when there is no history', () => {
    expect(resolveAssigneeVelocityReadout(undefined, 'tester')).toBeNull();
  });
});
