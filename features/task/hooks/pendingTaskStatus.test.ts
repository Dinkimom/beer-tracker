import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { forgetTaskStatusChange, reconcileFetchedSprintTasks, rememberTaskStatusChange } from './pendingTaskStatus';

const applyPendingTaskStatuses = (response: { tasks: Task[] }, now: number) =>
  reconcileFetchedSprintTasks(response, undefined, now);

function task(id: string, originalStatus: string): Task {
  return { id, link: '#', name: id, originalStatus, statusColorKey: originalStatus, team: 'Web' };
}

const review = {
  originalStatus: 'inReview',
  originalStatusDisplay: 'In review',
  status: 'in-progress' as const,
  statusColorKey: 'inReview',
  statusTypeKey: 'inProgress',
};

describe('applyPendingTaskStatuses', () => {
  it('keeps the new status over a stale server response until the server catches up', () => {
    rememberTaskStatusChange('A-1', review, 0);

    const stale = applyPendingTaskStatuses({ tasks: [task('A-1', 'open'), task('A-2', 'open')] }, 1000);
    expect(stale.tasks[0]).toMatchObject({ originalStatus: 'inReview', statusColorKey: 'inReview' });
    expect(stale.tasks[1]).toMatchObject({ originalStatus: 'open' });

    const caughtUp = { tasks: [{ ...task('A-1', 'inReview'), statusColorKey: 'server' }] };
    expect(applyPendingTaskStatuses(caughtUp, 2000)).toBe(caughtUp);
    // Сервер догнал — запись снята, дальнейшие смены вне планера не перекрываются.
    const later = { tasks: [task('A-1', 'closed')] };
    expect(applyPendingTaskStatuses(later, 3000)).toBe(later);
  });

  it('stops overriding the server after the TTL', () => {
    rememberTaskStatusChange('B-1', review, 0);
    const response = { tasks: [task('B-1', 'open')] };
    expect(applyPendingTaskStatuses(response, 10 * 60_000)).toBe(response);
  });

  it('forgets a status change that failed', () => {
    rememberTaskStatusChange('C-1', review, 0);
    forgetTaskStatusChange('C-1');
    const response = { tasks: [task('C-1', 'open')] };
    expect(applyPendingTaskStatuses(response, 1000)).toBe(response);
  });
});

describe('reconcileFetchedSprintTasks', () => {
  it('keeps client-only drafts that the server response does not know about', () => {
    const draft = { ...task('local-task-1', 'todo'), isLocalTask: true, localDraftKind: 'comment' as const, name: '' };
    const previous = { tasks: [task('D-1', 'open'), draft] };
    const fresh = { tasks: [task('D-1', 'closed')] };

    expect(reconcileFetchedSprintTasks(fresh, previous, 0).tasks.map((item) => item.id)).toEqual(['D-1', 'local-task-1']);
    expect(reconcileFetchedSprintTasks(fresh, undefined, 0)).toBe(fresh);
  });
});
