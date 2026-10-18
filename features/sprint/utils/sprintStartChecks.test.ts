import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { collectInvalidSprintDevTasks } from './sprintStartChecks';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = partial;
  return {
    id,
    link: 'https://t',
    name: 'Task',
    team: 'Web',
    storyPoints: 1,
    testPoints: 1,
    productTeam: ['p'],
    functionalTeam: 'ft',
    stage: 'st',
    ...rest,
  };
}

describe('collectInvalidSprintDevTasks', () => {
  it('skips QA tasks and goal tasks', () => {
    const invalid = collectInvalidSprintDevTasks(
      [
        task({ id: 'bad', storyPoints: undefined, testPoints: 1 }),
        task({ id: 'qa', team: 'QA', storyPoints: undefined, testPoints: 1 }),
        task({ id: 'goal', storyPoints: undefined, testPoints: 1 }),
      ],
      ['goal']
    );
    expect(invalid.map((x) => x.task.id)).toEqual(['bad']);
  });

  it('returns tasks with validation issues for dev backlog', () => {
    const invalid = collectInvalidSprintDevTasks([
      task({ id: 'ok', storyPoints: 0, testPoints: 0 }),
      task({
        id: 'no-sp',
        storyPoints: undefined,
        testPoints: 0,
        productTeam: ['p'],
        functionalTeam: 'f',
        stage: 's',
      }),
    ]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.issues.some((i) => i.type === 'missing-sp')).toBe(true);
  });

  it('skips closed tasks even when fields are invalid', () => {
    const invalid = collectInvalidSprintDevTasks([
      task({
        id: 'closed-bad',
        originalStatus: 'closed',
        storyPoints: undefined,
        testPoints: undefined,
      }),
    ]);
    expect(invalid).toHaveLength(0);
  });

  it('skips rc tasks when fields are invalid', () => {
    const invalid = collectInvalidSprintDevTasks([
      task({
        id: 'rc-bad',
        originalStatus: 'rc',
        storyPoints: undefined,
        testPoints: undefined,
      }),
    ]);
    expect(invalid).toHaveLength(0);
  });
});
