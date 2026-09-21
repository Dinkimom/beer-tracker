import { describe, expect, it } from 'vitest';

import { clipPhaseToSprint } from './quarterlyPlansRouteHelpers';

describe('clipPhaseToSprint', () => {
  it('returns segment fully inside sprint', () => {
    const phase = {
      id: 'p1',
      kind: 'delivery' as const,
      durationDays: 3,
      sprintIndex: 1,
      startDay: 2,
    };
    const out = clipPhaseToSprint(phase, 1);
    expect(out).toEqual({
      id: 'p1',
      kind: 'delivery',
      durationDays: 3,
      sprintIndex: 1,
      startDay: 2,
    });
  });

  it('returns null when phase does not overlap sprint', () => {
    const phase = {
      id: 'p2',
      kind: 'delivery' as const,
      durationDays: 1,
      sprintIndex: 0,
      startDay: 0,
    };
    const out = clipPhaseToSprint(phase, 2);
    expect(out).toBeNull();
  });

  it('clips phase spanning sprint boundary', () => {
    const phase = {
      id: 'p3',
      kind: 'discovery' as const,
      durationDays: 5,
      sprintIndex: 1,
      startDay: 8,
    };
    const out = clipPhaseToSprint(phase, 1);
    expect(out).toEqual({
      id: 'p3',
      kind: 'discovery',
      durationDays: 2,
      sprintIndex: 1,
      startDay: 8,
    });
  });
});
