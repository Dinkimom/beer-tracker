import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { applyLocalParentToTasks, trackerParentKeyAfterPlannerChange } from './useSprintPlannerContextMenuHandlers';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    link: '',
    name: partial.name ?? partial.id,
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

describe('applyLocalParentToTasks', () => {
  it('снимает родителя и возвращает предыдущего', () => {
    const previous = { display: 'Фича', id: 'ST-1', key: 'ST-1' };
    const { next, previous: captured } = applyLocalParentToTasks(
      [task({ id: 'BT-1', parent: previous }), task({ id: 'BT-2' })],
      'BT-1',
      null
    );
    expect(captured).toEqual(previous);
    expect(next[0]?.parent).toBeUndefined();
    expect(next[1]?.parent).toBeUndefined();
  });

  it('ставит нового родителя у основной и QA-копии', () => {
    const parent = { display: 'Новая', id: 'ST-2', key: 'ST-2' };
    const { next } = applyLocalParentToTasks(
      [task({ id: 'BT-1' }), task({ id: 'BT-1-qa', originalTaskId: 'BT-1' })],
      'BT-1',
      parent
    );
    expect(next[0]?.parent).toEqual(parent);
    expect(next[1]?.parent).toEqual(parent);
  });
});

describe('trackerParentKeyAfterPlannerChange', () => {
  const story = { display: 'Стори', id: 'ST-9', key: 'ST-9' };
  const draft = { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' };

  it('с эпика/стори на драфт снимает родителя в Трекере', () => {
    expect(trackerParentKeyAfterPlannerChange(story, draft)).toBeNull();
  });

  it('не ходит в Трекер между драфтами и «без родителя»', () => {
    expect(trackerParentKeyAfterPlannerChange(undefined, draft)).toBeUndefined();
    expect(trackerParentKeyAfterPlannerChange(draft, null)).toBeUndefined();
    expect(trackerParentKeyAfterPlannerChange(draft, {
      display: 'Другой',
      id: 'feature-draft:2',
      key: 'feature-draft:2',
    })).toBeUndefined();
  });

  it('ставит ключ Трекера при переносе на эпик/стори', () => {
    expect(trackerParentKeyAfterPlannerChange(draft, story)).toBe('ST-9');
    expect(trackerParentKeyAfterPlannerChange(undefined, story)).toBe('ST-9');
  });
});
