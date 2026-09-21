import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { canAutoAddTaskToSwimlane, resolveAutoAddAssigneeId } from './canAutoAddTaskToSwimlane';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return partial as Task;
}

describe('resolveAutoAddAssigneeId', () => {
  it('uses assignee for non-QA tasks', () => {
    expect(resolveAutoAddAssigneeId(task({ id: 'T-1', assignee: 'dev-1' }))).toBe('dev-1');
  });

  it('uses qaEngineer for QA tasks', () => {
    expect(
      resolveAutoAddAssigneeId(
        task({ id: 'T-1', team: 'QA', assignee: 'dev-1', qaEngineer: 'qa-1' })
      )
    ).toBe('qa-1');
  });

  it('returns undefined when assignee is missing', () => {
    expect(resolveAutoAddAssigneeId(task({ id: 'T-1' }))).toBeUndefined();
    expect(resolveAutoAddAssigneeId(task({ id: 'T-1', team: 'QA' }))).toBeUndefined();
  });
});

describe('canAutoAddTaskToSwimlane', () => {
  const onBoard = ['dev-1', 'qa-1'] as const;

  it('requires positive estimate', () => {
    expect(
      canAutoAddTaskToSwimlane({
        developerIds: onBoard,
        estimatedSP: 0,
        task: task({ id: 'T-1', assignee: 'dev-1' }),
      })
    ).toBe(false);
  });

  it('requires assignee', () => {
    expect(
      canAutoAddTaskToSwimlane({
        developerIds: onBoard,
        estimatedSP: 2,
        task: task({ id: 'T-1' }),
      })
    ).toBe(false);
  });

  it('requires assignee to be on the board', () => {
    expect(
      canAutoAddTaskToSwimlane({
        developerIds: onBoard,
        estimatedSP: 2,
        task: task({ id: 'T-1', assignee: 'off-board' }),
      })
    ).toBe(false);
  });

  it('allows when assignee is on the board and estimate is positive', () => {
    expect(
      canAutoAddTaskToSwimlane({
        developerIds: onBoard,
        estimatedSP: 2,
        task: task({ id: 'T-1', assignee: 'dev-1' }),
      })
    ).toBe(true);
  });

  it('allows QA when qaEngineer is on the board', () => {
    expect(
      canAutoAddTaskToSwimlane({
        developerIds: onBoard,
        estimatedSP: 1,
        task: task({ id: 'T-1', team: 'QA', qaEngineer: 'qa-1' }),
      })
    ).toBe(true);
  });
});
