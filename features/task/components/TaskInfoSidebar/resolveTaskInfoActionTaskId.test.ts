import { describe, expect, it } from 'vitest';

import { resolveTaskInfoActionTaskId } from './resolveTaskInfoActionTaskId';

describe('resolveTaskInfoActionTaskId', () => {
  it('returns task id for regular tasks', () => {
    expect(
      resolveTaskInfoActionTaskId({
        id: 'DEV-1',
        link: '',
        name: 'T',
        team: 'Web',
      })
    ).toBe('DEV-1');
  });

  it('returns originalTaskId for synthetic QA with volume', () => {
    expect(
      resolveTaskInfoActionTaskId({
        id: 'DEV-1-qa',
        link: '',
        name: 'T',
        team: 'QA',
        originalTaskId: 'DEV-1',
        storyPoints: 2,
        testPoints: 1,
      })
    ).toBe('DEV-1');
  });

  it('keeps QA id when there is no development volume', () => {
    expect(
      resolveTaskInfoActionTaskId({
        id: 'DEV-1-qa',
        link: '',
        name: 'T',
        team: 'QA',
        originalTaskId: 'DEV-1',
        storyPoints: 0,
        testPoints: 0,
      })
    ).toBe('DEV-1-qa');
  });
});
