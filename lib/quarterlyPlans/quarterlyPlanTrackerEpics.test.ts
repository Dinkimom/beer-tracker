import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { trackerEpicFromTask } from './quarterlyPlanTrackerEpics';

const rules = { requireResolution: false, statusTypeByKey: { closed: 'done', inProgress: 'inProgress' } };

function task(patch: Partial<Task>): Task {
  return { id: 'DEMO-1', name: 'Payment step API', ...patch } as Task;
}

describe('trackerEpicFromTask', () => {
  it('название, подпись и цвет статуса — как у карточки задачи', () => {
    expect(
      trackerEpicFromTask(
        task({ originalStatus: 'inProgress', originalStatusDisplay: 'В работе', statusColorKey: 'inprogress' }),
        rules
      )
    ).toEqual({ done: false, statusColorKey: 'inprogress', statusDisplay: 'В работе', title: 'Payment step API' });
  });

  it('«сделано» — по канону C1, без подписи берётся ключ статуса', () => {
    expect(trackerEpicFromTask(task({ originalStatus: 'closed' }), rules)).toEqual({
      done: true,
      statusColorKey: 'closed',
      statusDisplay: 'closed',
      title: 'Payment step API',
    });
  });
});
