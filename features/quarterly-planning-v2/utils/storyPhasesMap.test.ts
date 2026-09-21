import type { StoryPhasePosition } from '../types';

import { describe, expect, it } from 'vitest';

import {
  normalizeStoryPhasesFromApi,
  parseQuarterlyPhaseTaskId,
  quarterlyPhaseTaskId,
} from './storyPhasesMap';

describe('normalizeStoryPhasesFromApi', () => {
  it('wraps legacy single phase as delivery array', () => {
    const out = normalizeStoryPhasesFromApi({
      'NW-1': { sprintIndex: 0, startDay: 1, durationDays: 3 } as StoryPhasePosition,
    });
    expect(out['NW-1']).toHaveLength(1);
    expect(out['NW-1']![0].kind).toBe('delivery');
    expect(out['NW-1']![0].sprintIndex).toBe(0);
  });

  it('keeps array with discovery kind', () => {
    const out = normalizeStoryPhasesFromApi({
      'NW-2': [
        {
          id: 'a',
          kind: 'delivery',
          sprintIndex: 0,
          startDay: 0,
          durationDays: 2,
        },
        {
          id: 'b',
          kind: 'discovery',
          sprintIndex: 1,
          startDay: 0,
          durationDays: 4,
        },
      ],
    });
    expect(out['NW-2']).toHaveLength(2);
    expect(out['NW-2']![1].kind).toBe('discovery');
  });
});

describe('quarterlyPhaseTaskId', () => {
  it('round-trips story key and phase id', () => {
    const id = quarterlyPhaseTaskId('NW-9', 'phase-1');
    expect(parseQuarterlyPhaseTaskId(id)).toEqual({
      storyKey: 'NW-9',
      phaseId: 'phase-1',
    });
  });
});
