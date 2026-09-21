import { describe, expect, it } from 'vitest';

import { flattenQueueIssueTypes } from './queueIssueTypes';

describe('flattenQueueIssueTypes', () => {
  it('merges types from all workflows and deduplicates by key', () => {
    const types = flattenQueueIssueTypes({
      wf1: [
        { id: '1', key: 'task', display: 'Задача' },
        { id: '2', key: 'bug', display: 'Ошибка' },
      ],
      wf2: [
        { id: '3', key: 'task', display: 'Task duplicate' },
        { id: '4', key: 'story', display: 'Story' },
      ],
    });

    expect(types.sort((a, b) => a.key.localeCompare(b.key))).toEqual(
      [
        { key: 'bug', label: 'Ошибка' },
        { key: 'story', label: 'Story' },
        { key: 'task', label: 'Задача' },
      ].sort((a, b) => a.key.localeCompare(b.key))
    );
  });

  it('falls back to key when display is empty', () => {
    expect(flattenQueueIssueTypes({ wf: [{ id: '1', key: 'epic' }] })).toEqual([
      { key: 'epic', label: 'epic' },
    ]);
  });
});
