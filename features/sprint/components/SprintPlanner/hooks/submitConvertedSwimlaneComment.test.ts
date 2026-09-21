import type { Comment, Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { createIssue } from '@/lib/api/issues';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import { submitConvertedSwimlaneComment } from './submitConvertedSwimlaneComment';

vi.mock('@/lib/api/issues', () => ({
  createIssue: vi.fn(() =>
    Promise.resolve({
      success: true,
      key: 'TASK-9',
      task: { id: 'TASK-9', link: '#', name: 'From note', team: 'Back' },
    })
  ),
}));

const mockedCreateIssue = vi.mocked(createIssue);

function comment(partial?: Partial<Comment>): Comment {
  return {
    assigneeId: 'dev-1',
    day: 2,
    height: 1,
    id: 'note-1',
    part: 1,
    text: 'Sticky text',
    width: 3,
    x: 0,
    y: 0,
    ...partial,
  };
}

function baseInput(partial?: Partial<Parameters<typeof submitConvertedSwimlaneComment>[0]>) {
  return {
    comment: comment(),
    createFailedMessage: 'failed',
    defaultQueue: 'QUEUE' as string | null,
    fallbackTitle: 'New task',
    invalidateOccupancyQueries: vi.fn(),
    missingAssigneeMessage: 'pick assignee',
    missingQueueMessage: 'no queue',
    onCommentDelete: vi.fn(),
    savePosition: vi.fn(() => Promise.resolve()),
    selectedSprintId: 10,
    setTaskPositions: vi.fn(
      (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) =>
        updater(new Map())
    ),
    setTasks: vi.fn((updater: (prev: Task[]) => Task[]) => updater([])),
    ...partial,
  };
}

describe('submitConvertedSwimlaneComment', () => {
  it('creates an issue, places it on the note cell, and deletes the note', async () => {
    const onCommentDelete = vi.fn();
    const savePosition = vi.fn(() => Promise.resolve());
    const invalidateOccupancyQueries = vi.fn();

    const result = await submitConvertedSwimlaneComment(
      baseInput({
        draftTitle: 'Converted title',
        fields: { issueType: 'task', parentKey: '', queueKey: 'QUEUE' },
        invalidateOccupancyQueries,
        onCommentDelete,
        savePosition,
      })
    );

    expect(result).toEqual({
      ok: true,
      issueKey: 'TASK-9',
      task: { id: 'TASK-9', link: '#', name: 'From note', team: 'Back' },
    });
    expect(savePosition).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee: 'dev-1',
        duration: 3,
        startDay: 2,
        startPart: 1,
        taskId: 'TASK-9',
      }),
      false
    );
    expect(onCommentDelete).toHaveBeenCalledWith('note-1', { retargetLinksTo: 'TASK-9' });
    expect(invalidateOccupancyQueries).toHaveBeenCalled();
  });

  it('returns an error when the queue is missing', async () => {
    const result = await submitConvertedSwimlaneComment(baseInput({ defaultQueue: null }));

    expect(result).toEqual({ ok: false, error: 'no queue' });
  });

  it('requires a person when converting a team-lane note', async () => {
    mockedCreateIssue.mockClear();
    const result = await submitConvertedSwimlaneComment(
      baseInput({
        comment: comment({ assigneeId: TEAM_SWIMLANE_ASSIGNEE_ID }),
        fields: { issueType: 'task', parentKey: '', queueKey: 'QUEUE' },
      })
    );

    expect(result).toEqual({ ok: false, error: 'pick assignee' });
    expect(mockedCreateIssue).not.toHaveBeenCalled();
  });

  it('places the converted task on the chosen person, not the team lane', async () => {
    mockedCreateIssue.mockClear();
    const savePosition = vi.fn(() => Promise.resolve());

    await submitConvertedSwimlaneComment(
      baseInput({
        comment: comment({ assigneeId: TEAM_SWIMLANE_ASSIGNEE_ID }),
        fields: {
          assigneeId: 'dev-2',
          issueType: 'task',
          parentKey: '',
          queueKey: 'QUEUE',
        },
        savePosition,
      })
    );

    expect(mockedCreateIssue).toHaveBeenCalledWith(expect.objectContaining({ assignee: 'dev-2' }));
    expect(savePosition).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: 'dev-2', taskId: 'TASK-9' }),
      false
    );
  });

  it('keeps a feature draft as a local parent and does not send it to Tracker', async () => {
    mockedCreateIssue.mockClear();
    const draftParent = { display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' };
    const setTasks = vi.fn((updater: (prev: Task[]) => Task[]) => updater([]));

    const result = await submitConvertedSwimlaneComment(
      baseInput({
        fields: {
          issueType: 'task',
          parentKey: 'feature-draft:1',
          queueKey: 'QUEUE',
        },
        plannerParent: draftParent,
        setTasks,
      })
    );

    expect(mockedCreateIssue).toHaveBeenCalledWith(
      expect.objectContaining({ parent: undefined })
    );
    expect(result).toMatchObject({
      ok: true,
      task: expect.objectContaining({ parent: draftParent }),
    });
  });

  it('asks to retarget the note arrows onto the created task', async () => {
    const onCommentDelete = vi.fn();

    await submitConvertedSwimlaneComment(baseInput({ onCommentDelete }));

    expect(onCommentDelete).toHaveBeenCalledWith('note-1', { retargetLinksTo: 'TASK-9' });
  });
});
