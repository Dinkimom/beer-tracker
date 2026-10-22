import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { describe, expect, it } from 'vitest';

import {
  SPRINT_PRESENCE_COLOR_COUNT,
  sprintPresenceColorSlots,
  sprintPresenceViewerColor,
} from './sprintPresenceColor';

function viewer(userId: string): SprintPresenceViewer {
  return { avatarUrl: null, displayName: userId, userId };
}

const team = ['u-ada', 'u-bob', 'u-cara', 'u-dan', 'u-eve', 'u-finn', 'u-gus', 'u-hal'].map(viewer);

describe('sprintPresenceColorSlots', () => {
  it('gives every viewer a distinct slot while the palette lasts', () => {
    const slots = sprintPresenceColorSlots(team);
    expect(new Set(slots.values()).size).toBe(SPRINT_PRESENCE_COLOR_COUNT);
  });

  it('does not depend on the order of the snapshot', () => {
    expect([...sprintPresenceColorSlots([...team].reverse())].sort()).toEqual(
      [...sprintPresenceColorSlots(team)].sort()
    );
  });

  it('keeps a lone viewer on the same color across sessions', () => {
    const [ada] = team;
    expect(sprintPresenceColorSlots([ada!]).get('u-ada')).toBe(
      sprintPresenceColorSlots([ada!]).get('u-ada')
    );
  });

  it('wraps around the palette when the board is crowded', () => {
    const crowd = [...team, viewer('u-ivy'), viewer('u-jon')];
    const slots = sprintPresenceColorSlots(crowd);
    expect(slots.size).toBe(crowd.length);
    for (const slot of slots.values()) {
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(SPRINT_PRESENCE_COLOR_COUNT);
    }
  });
});

describe('sprintPresenceViewerColor', () => {
  it('maps a slot to its palette token', () => {
    const slots = new Map([['u-ada', 2]]);
    expect(sprintPresenceViewerColor(slots, viewer('u-ada'))).toBe('var(--presence-color-3)');
  });

  it('falls back to the hashed slot for a viewer missing from the snapshot', () => {
    expect(sprintPresenceViewerColor(new Map(), viewer('u-ada'))).toMatch(
      /^var\(--presence-color-[1-8]\)$/
    );
  });
});
