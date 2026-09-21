import type { Developer, Task } from '@/types';
import type { ChecklistItem } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { calculateSprintStartChecks, collectInvalidSprintDevTasks } from './sprintStartChecks';

function checklist(text: string): ChecklistItem {
  return {
    checked: false,
    checklistItemType: 'standard',
    id: 'c1',
    text,
  };
}

function dev(partial: Partial<Developer> & Pick<Developer, 'id'>): Developer {
  return {
    name: 'N',
    role: 'developer',
    ...partial,
  };
}

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

describe('calculateSprintStartChecks', () => {
  it('fails check1 when there are no goals', () => {
    const r = calculateSprintStartChecks([], [], [], new Map(), undefined, null, true);
    expect(r.hasGoals).toBe(false);
    expect(r.check1Passed).toBe(false);
  });

  it('passes check1 for SMART goals when requireSmartGoals is true', () => {
    const r = calculateSprintStartChecks(
      [checklist('увеличить конверсию на 5 процентов за спринт')],
      [],
      [],
      new Map(),
      undefined,
      null,
      true
    );
    expect(r.check1Passed).toBe(true);
    expect(r.allGoalsSmart).toBe(true);
  });

  it('fails check3 when invalid dev tasks exist', () => {
    const r = calculateSprintStartChecks(
      [checklist('реализовать метрику 10')],
      [task({ id: 'x', storyPoints: undefined, testPoints: 0 })],
      [dev({ id: 'd1', role: 'developer' })],
      new Map(),
      undefined,
      null,
      true
    );
    expect(r.check3Passed).toBe(false);
    expect(r.invalidTasks.length).toBeGreaterThan(0);
    expect(r.allChecksPassed).toBe(false);
  });

  it('enforces 20 SP per developer and 24 TP per tester for a full 10-day sprint', () => {
    const developers: Developer[] = [
      dev({ id: 'dev1', role: 'developer' }),
      dev({ id: 'qa1', role: 'tester' }),
    ];
    const tasks: Task[] = [
      task({
        id: 't1',
        assignee: 'dev1',
        storyPoints: 20,
        testPoints: 0,
        team: 'Web',
      }),
      task({
        id: 't2',
        team: 'QA',
        qaEngineer: 'qa1',
        storyPoints: 0,
        testPoints: 24,
        assignee: 'qa1',
      }),
    ];
    const qaMap = new Map(tasks.filter((t) => t.team === 'QA').map((t) => [t.id, t]));
    const r = calculateSprintStartChecks(
      [checklist('улучшить показатель 99')],
      tasks,
      developers,
      qaMap,
      undefined,
      null,
      true,
      null,
      10
    );
    expect(r.check2Passed).toBe(true);
    expect(r.loadNorms).toEqual({ workingDaysCount: 10, requiredSP: 20, requiredTP: 24 });
    expect(r.check3Passed).toBe(true);
    expect(r.allChecksPassed).toBe(true);
  });

  it('scales load norms for a 5-day sprint to 10 SP and 12 TP', () => {
    const developers: Developer[] = [
      dev({ id: 'dev1', role: 'developer' }),
      dev({ id: 'qa1', role: 'tester' }),
    ];
    const tasks: Task[] = [
      task({
        id: 't1',
        assignee: 'dev1',
        storyPoints: 10,
        testPoints: 0,
        team: 'Web',
      }),
      task({
        id: 't2',
        team: 'QA',
        qaEngineer: 'qa1',
        storyPoints: 0,
        testPoints: 12,
        assignee: 'qa1',
      }),
    ];
    const qaMap = new Map(tasks.filter((t) => t.team === 'QA').map((t) => [t.id, t]));
    const r = calculateSprintStartChecks(
      [checklist('улучшить показатель 99')],
      tasks,
      developers,
      qaMap,
      undefined,
      null,
      true,
      null,
      5
    );
    expect(r.loadNorms).toEqual({ workingDaysCount: 5, requiredSP: 10, requiredTP: 12 });
    expect(r.check2Passed).toBe(true);
  });

  it('fails check2 when loads match two-week norms on a one-week sprint', () => {
    const developers: Developer[] = [dev({ id: 'dev1', role: 'developer' })];
    const tasks: Task[] = [
      task({
        id: 't1',
        assignee: 'dev1',
        storyPoints: 20,
        testPoints: 0,
        team: 'Web',
      }),
    ];
    const r = calculateSprintStartChecks(
      [checklist('улучшить показатель 99')],
      tasks,
      developers,
      new Map(),
      undefined,
      null,
      true,
      null,
      5
    );
    expect(r.check2Passed).toBe(false);
    expect(r.loadNorms.requiredSP).toBe(10);
  });
});
