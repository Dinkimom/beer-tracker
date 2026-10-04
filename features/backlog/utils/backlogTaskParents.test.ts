import { describe, expect, it } from 'vitest';

import {
  BACKLOG_TASK_PARENT_SEPARATOR,
  formatBacklogTaskParentChain,
  resolveBacklogTaskParents,
} from './backlogTaskParents';

const epic = {
  display: 'Приём администратора',
  id: 'epic-1',
  key: 'RND-100',
};

const story = {
  display: 'Статистика ресепшена',
  id: 'story-1',
  key: 'RND-200',
};

describe('resolveBacklogTaskParents', () => {
  it('returns nothing when the task has no parent', () => {
    expect(resolveBacklogTaskParents({})).toEqual([]);
  });

  it('shows the immediate parent', () => {
    expect(resolveBacklogTaskParents({ parent: story })).toEqual([
      { key: 'RND-200', title: 'Статистика ресепшена' },
    ]);
  });

  it('puts the epic before the parent and drops a duplicate key', () => {
    expect(resolveBacklogTaskParents({ epic, parent: story })).toEqual([
      { key: 'RND-100', title: 'Приём администратора' },
      { key: 'RND-200', title: 'Статистика ресепшена' },
    ]);
    expect(resolveBacklogTaskParents({ epic, parent: { ...epic, display: 'Другое имя' } })).toEqual([
      { key: 'RND-100', title: 'Приём администратора' },
    ]);
  });

  it('strips a key that is already prefixed onto the display name', () => {
    expect(
      resolveBacklogTaskParents({
        parent: { display: 'RND-200 · Статистика', id: 'story-1', key: 'RND-200' },
      })
    ).toEqual([{ key: 'RND-200', title: 'Статистика' }]);
    expect(
      resolveBacklogTaskParents({
        parent: { display: 'RND-200', id: 'story-1', key: 'RND-200' },
      })
    ).toEqual([{ key: 'RND-200', title: '' }]);
  });

  it('skips local feature-draft parents', () => {
    expect(
      resolveBacklogTaskParents({
        parent: {
          display: 'Черновик',
          id: 'feature-draft:abc',
          key: 'feature-draft:abc',
        },
      })
    ).toEqual([]);
  });
});

describe('formatBacklogTaskParentChain', () => {
  it('joins parents from epic to story', () => {
    expect(
      formatBacklogTaskParentChain([
        { key: 'RND-100', title: 'Приём администратора' },
        { key: 'RND-200', title: 'Статистика ресепшена' },
      ])
    ).toBe(`RND-100 Приём администратора${BACKLOG_TASK_PARENT_SEPARATOR}RND-200 Статистика ресепшена`);
  });
});
