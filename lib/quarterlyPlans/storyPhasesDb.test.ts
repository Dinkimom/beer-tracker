import { describe, expect, it } from 'vitest';

import { storyPhasesPutEntries } from './storyPhasesDb';

describe('storyPhasesPutEntries', () => {
  it('emits delivery and discovery for the same story', () => {
    const entries = storyPhasesPutEntries({
      'NW-6827': [
        {
          id: 'd1',
          kind: 'delivery',
          sprintIndex: 0,
          startDay: 0,
          durationDays: 5,
        },
        {
          id: 'd2',
          kind: 'discovery',
          sprintIndex: 1,
          startDay: 0,
          durationDays: 3,
        },
      ],
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.phase.kind)).toEqual(['delivery', 'discovery']);
    expect(entries.every((e) => e.storyKey === 'NW-6827')).toBe(true);
  });
});
