import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { describe, expect, it } from 'vitest';

import {
  shouldShowSprintPresenceAvatars,
  splitSprintPresenceAvatars,
  sprintPresenceLabelName,
} from './SprintPlannerPresenceAvatars';

const ada: SprintPresenceViewer = { avatarUrl: null, displayName: 'Ada', userId: 'u1' };
const bob: SprintPresenceViewer = { avatarUrl: null, displayName: 'Bob', userId: 'u2' };

describe('SprintPlannerPresenceAvatars helpers', () => {
  it('keeps everyone when the stack fits', () => {
    expect(splitSprintPresenceAvatars([ada, bob], 4)).toEqual({ extra: [], shown: [ada, bob] });
  });

  it('overflows past the visible cap', () => {
    const viewers = [ada, bob, { ...ada, userId: 'u3', displayName: 'Cara' }, { ...ada, userId: 'u4', displayName: 'Dan' }, { ...ada, userId: 'u5', displayName: 'Eve' }];
    const split = splitSprintPresenceAvatars(viewers, 4);
    expect(split.shown).toHaveLength(4);
    expect(split.extra.map((viewer) => viewer.displayName)).toEqual(['Eve']);
  });

  it('uses the anonymous label for on-prem guests', () => {
    expect(
      sprintPresenceLabelName({ avatarUrl: null, displayName: 'onprem-a', userId: 'onprem-anonymous' }, 'Гость')
    ).toBe('Гость');
    expect(sprintPresenceLabelName(ada, 'Гость')).toBe('Ada');
  });

  it('does not show a raw user-id stub as a display name', () => {
    expect(
      sprintPresenceLabelName(
        {
          avatarUrl: null,
          displayName: '917cc9fe',
          userId: '917cc9fe-1111-4111-8111-111111111111',
        },
        'Гость'
      )
    ).toBe('Гость');
  });

  it('shows the stack only when at least two people are present', () => {
    expect(shouldShowSprintPresenceAvatars([])).toBe(false);
    expect(shouldShowSprintPresenceAvatars([ada])).toBe(false);
    expect(shouldShowSprintPresenceAvatars([ada, bob])).toBe(true);
  });

  it('still collapses several tabs of the same person into one avatar', () => {
    expect(
      shouldShowSprintPresenceAvatars([
        ada,
        { avatarUrl: 'https://cdn.example/a.png', displayName: '917cc9fe', userId: 'u1' },
      ])
    ).toBe(false);
    expect(
      shouldShowSprintPresenceAvatars([
        ada,
        bob,
        { avatarUrl: 'https://cdn.example/a.png', displayName: '917cc9fe', userId: 'u1' },
      ])
    ).toBe(true);
  });
});
