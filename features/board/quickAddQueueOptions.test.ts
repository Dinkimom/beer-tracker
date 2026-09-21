import { describe, expect, it } from 'vitest';

import {
  buildQuickAddQueueOptionsFromBoards,
  formatQuickAddQueueLabel,
  resolveQuickAddDraftQueueKey,
} from '@/features/board/quickAddQueueOptions';

describe('buildQuickAddQueueOptionsFromBoards', () => {
  it('returns unique queue keys without team titles', () => {
    const options = buildQuickAddQueueOptionsFromBoards([
      {
        id: 1,
        name: 'Board A',
        queue: 'NW',
        team: 'team-a',
        teamTitle: 'Team Alpha',
      },
      {
        id: 2,
        name: 'Board B',
        queue: 'NW',
        team: 'team-b',
        teamTitle: 'Team Beta',
      },
      {
        id: 3,
        name: 'Board C',
        queue: 'HR',
        team: 'team-c',
        teamTitle: 'HR Team',
      },
    ]);

    expect(options).toEqual([
      { key: 'HR', name: 'HR' },
      { key: 'NW', name: 'NW' },
    ]);
  });
});

describe('formatQuickAddQueueLabel', () => {
  it('formats key and tracker queue name', () => {
    expect(formatQuickAddQueueLabel('NW', 'New Widget')).toBe('NW: New Widget');
  });
});

describe('resolveQuickAddDraftQueueKey', () => {
  it('prefers the task queue, then the team board queue, then the first list option', () => {
    expect(resolveQuickAddDraftQueueKey('TASKQ', 'TEAM', 'AAA')).toBe('TASKQ');
    expect(resolveQuickAddDraftQueueKey(undefined, 'TEAM', 'AAA')).toBe('TEAM');
    expect(resolveQuickAddDraftQueueKey('  ', 'TEAM', 'AAA')).toBe('TEAM');
    expect(resolveQuickAddDraftQueueKey(undefined, undefined, 'AAA')).toBe('AAA');
    expect(resolveQuickAddDraftQueueKey(undefined, undefined, undefined)).toBe('');
  });
});
