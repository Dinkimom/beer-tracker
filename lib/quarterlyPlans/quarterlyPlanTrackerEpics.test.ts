import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { loadQuarterlyPlanTrackerEpics, markTrackerEpicChanged, trackerEpicFromTask } from './quarterlyPlanTrackerEpics';

vi.mock('@/lib/snapshots/issueSnapshotReadDb', () => ({
  findIssueSnapshotMetaByKeys: vi.fn(() => Promise.resolve([{ key: 'DEMO-1' }])),
}));
vi.mock('@/lib/trackerApi/issues', () => ({
  mapTrackerIssueToTask: () => ({ id: 'DEMO-1', name: 'Payment step API', originalStatus: 'inProgress' }),
}));
vi.mock('@/lib/sprints/loadSprintTaskCompletionRules', () => ({
  loadSprintTaskCompletionRules: vi.fn(() => Promise.resolve({ requireResolution: false, statusTypeByKey: { closed: 'done' } })),
}));
vi.mock('@/lib/trackerIntegration/loadForOrganization', () => ({
  loadTrackerIntegrationForOrganization: vi.fn(() => Promise.resolve(null)),
}));

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

describe('строка после смены статуса с доски (QE7)', () => {
  it('читается из трекера, минуя снимок, который перехода ещё не знает', async () => {
    const issueTracker = {
      getIssue: vi.fn((key: string) => Promise.resolve({ key })),
      mapIssueToTask: () => ({ id: 'DEMO-1', name: 'Payment step API', originalStatus: 'closed' }),
    } as unknown as IssueTrackerProviderClient;
    const load = () => loadQuarterlyPlanTrackerEpics({ issueKeys: ['DEMO-1'], issueTracker, organizationId: 'org-status' });

    expect((await load())['DEMO-1']).toMatchObject({ done: false, statusDisplay: 'inProgress' });
    markTrackerEpicChanged('org-status', 'DEMO-1');
    expect((await load())['DEMO-1']).toMatchObject({ done: true, statusDisplay: 'closed' });
  });
});
