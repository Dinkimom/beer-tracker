import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildSyntheticQaTaskId, createQATasksMap } from './qaTaskUtils';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return { link: '', name: partial.id, team: 'Web', storyPoints: 2, testPoints: 1, ...partial };
}

describe('createQATasksMap', () => {
  it('creates a QA phantom keyed by the dev task id', () => {
    const map = createQATasksMap([
      task({
        id: 'T-1',
        assignee: 'dev',
        assigneeName: 'Dev',
        qaEngineer: 'qa',
        qaEngineerName: 'QA',
        originalStatus: 'inProgress',
      }),
    ]);
    const qa = map.get('T-1');
    expect(qa).toMatchObject({
      assignee: 'qa',
      assigneeName: 'QA',
      id: buildSyntheticQaTaskId('T-1'),
      name: '[QA] T-1',
      originalStatus: 'readyfordevelopment',
      originalTaskId: 'T-1',
      storyPoints: 0,
      team: 'QA',
      testPoints: 1,
    });
  });

  it('is deterministic for the same dev id', () => {
    const a = createQATasksMap([task({ id: 'T-1' })]).get('T-1')?.id;
    const b = createQATasksMap([task({ id: 'T-1' })]).get('T-1')?.id;
    expect(a).toBe(b);
    expect(a).not.toBe('T-1');
  });

  it('skips tasks without test points, QA-team tasks, QA-only tasks and hidden TP', () => {
    const map = createQATasksMap([
      task({ id: 'no-tp', testPoints: 0 }),
      task({ id: 'undef-tp', testPoints: undefined }),
      task({ id: 'qa-team', team: 'QA' }),
      task({ id: 'qa-only', storyPoints: 0, testPoints: 3 }),
      task({ id: 'hidden', hideTestPointsByIntegration: true }),
      task({ id: 'ok' }),
    ]);
    expect([...map.keys()]).toEqual(['ok']);
  });
});
