import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  isSpCompleted,
  isTpCompleted,
  resolveTaskCompletionCategory,
  sprintTaskCompletionRulesFromIntegration,
  sprintTaskCompletionRulesFromPlanner,
} from './sprintTaskCompletion';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = partial;
  return {
    id,
    link: 'https://t',
    name: 'Task',
    team: 'Web',
    ...rest,
  };
}

describe('sprintTaskCompletion', () => {
  it('treats completing status type/category as SP and TP done', () => {
    const rules = sprintTaskCompletionRulesFromPlanner({
      releaseReadiness: { readyStatusKey: 'rc' },
      statusDefaultsByTrackerStatusType: { done: 'done' },
      statusOverridesByStatusKey: {},
    });
    const doneTask = task({
      id: '1',
      originalStatus: 'customClosed',
      statusTypeKey: 'done',
    });
    expect(resolveTaskCompletionCategory(doneTask, rules)).toBe('done');
    expect(isSpCompleted(doneTask, rules)).toBe(true);
    expect(isTpCompleted(doneTask, rules)).toBe(true);
  });

  it('counts readyStatusKey as TP done but not SP done', () => {
    const rules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: 'readyForRelease',
      statuses: {
        overridesByStatusKey: {
          readyForRelease: { category: 'in-progress' },
        },
      },
    });
    const ready = task({ id: '1', originalStatus: 'readyForRelease', status: 'in-progress' });
    expect(isTpCompleted(ready, rules)).toBe(true);
    expect(isSpCompleted(ready, rules)).toBe(false);
  });

  it('matches readyStatusKey by originalStatusId when overrides are id-keyed', () => {
    const rules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: '10042',
      statuses: {
        overridesByStatusKey: {
          '10042': { category: 'in-progress' },
        },
      },
    });
    const ready = task({
      id: '1',
      originalStatus: 'исследование',
      originalStatusId: '10042',
      status: 'in-progress',
    });
    expect(isTpCompleted(ready, rules)).toBe(true);
    expect(isSpCompleted(ready, rules)).toBe(false);
  });

  it('falls back to legacy rc as TP-ready when readyStatusKey is unset', () => {
    const rules = sprintTaskCompletionRulesFromPlanner(null);
    const rc = task({ id: '1', originalStatus: 'rc', status: 'done' });
    expect(isTpCompleted(rc, rules)).toBe(true);
    expect(isSpCompleted(rc, rules)).toBe(false);
  });

  it('counts exact Jira done status keys, not «готово к разработке»', () => {
    const rules = sprintTaskCompletionRulesFromPlanner(null);
    expect(isSpCompleted(task({ id: '1', originalStatus: 'готово' }), rules)).toBe(true);
    expect(isSpCompleted(task({ id: '2', originalStatus: "won'tbedone" }), rules)).toBe(true);
    expect(
      isSpCompleted(task({ id: '3', originalStatus: 'готово к разработке' }), rules)
    ).toBe(false);
    expect(
      isSpCompleted(task({ id: '4', originalStatus: 'readyfordevelopment' }), rules)
    ).toBe(false);
  });

  it('uses status type done for custom names without exact mapStatus key', () => {
    const rules = sprintTaskCompletionRulesFromPlanner(null);
    expect(
      isSpCompleted(
        task({ id: '1', originalStatus: 'customFinal', statusTypeKey: 'done' }),
        rules
      )
    ).toBe(true);
  });
});
