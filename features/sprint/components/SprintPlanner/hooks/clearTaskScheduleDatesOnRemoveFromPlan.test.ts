import { describe, expect, it } from 'vitest';

import { buildSyntheticQaTaskId } from '@/lib/qaTaskIdentity';

import {
  clearTaskScheduleDatesInList,
  resolveIssueKeyForScheduleClear,
} from './clearTaskScheduleDatesOnRemoveFromPlan';

describe('clearTaskScheduleDatesOnRemoveFromPlan', () => {
  it('resolves originalTaskId for synthetic QA cards', () => {
    const map = new Map([
      [
        'qa-1',
        {
          id: 'qa-1',
          name: 'QA',
          originalTaskId: 'RND-1',
          start: '2026-10-06',
          deadline: '2026-10-07',
        },
      ],
    ]);
    expect(resolveIssueKeyForScheduleClear('qa-1', map as never)).toBe('RND-1');
    expect(resolveIssueKeyForScheduleClear('RND-2', new Map())).toBe('RND-2');
  });

  it('clears start/deadline on the issue and its synthetic QA id', () => {
    const qaId = buildSyntheticQaTaskId('RND-1');
    const tasks = [
      { id: 'RND-1', name: 'Dev', start: '2026-10-06', deadline: '2026-10-07' },
      { id: qaId, name: 'QA', originalTaskId: 'RND-1', start: '2026-10-06', deadline: '2026-10-07' },
      { id: 'RND-2', name: 'Other', start: '2026-10-08', deadline: '2026-10-09' },
    ];
    const next = clearTaskScheduleDatesInList(tasks as never, 'RND-1');
    expect(next[0]).not.toHaveProperty('start');
    expect(next[0]).not.toHaveProperty('deadline');
    expect(next[1]).not.toHaveProperty('start');
    expect(next[2]).toMatchObject({ start: '2026-10-08', deadline: '2026-10-09' });
  });
});
