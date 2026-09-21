import type { Comment, Task } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIssue, updateIssueParent } from '@/lib/api/issues';

import {
  submitAttachedFeatureLane,
  submitConvertedFeatureLaneDraft,
  submitCreatedFeatureLane,
  submitExistingFeatureLaneDraft,
} from './submitConvertedFeatureLaneDraft';

vi.mock('@/lib/api/issues', () => ({
  createIssue: vi.fn(),
  updateIssueParent: vi.fn(),
}));

const createIssueMock = vi.mocked(createIssue);
const updateIssueParentMock = vi.mocked(updateIssueParent);

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

function comment(partial: Partial<Comment> & Pick<Comment, 'id'>): Comment {
  return {
    assigneeId: 'dev-1',
    day: 0,
    height: 2,
    part: 0,
    text: 'note',
    width: 2,
    x: 0,
    y: 0,
    ...partial,
  };
}

describe('submitConvertedFeatureLaneDraft', () => {
  beforeEach(() => {
    createIssueMock.mockReset();
    updateIssueParentMock.mockReset();
    updateIssueParentMock.mockResolvedValue(true);
  });

  it('создаёт задачу и переносит родителя у карточек и заметок', async () => {
    createIssueMock.mockResolvedValue({
      key: 'ST-9',
      success: true,
      task: task({ id: 'ST-9', name: 'Редизайн' }),
    });
    const onCommentParentChange = vi.fn();
    const onCreatedTask = vi.fn();
    const onLocalTaskParentChange = vi.fn();
    const onReplaceDraftRow = vi.fn();
    const result = await submitConvertedFeatureLaneDraft({
      comments: [
        comment({
          id: 'c1',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
      createFailedMessage: 'fail',
      issueType: 'story',
      missingQueueMessage: 'queue',
      onCommentParentChange,
      onCreatedTask,
      onLocalTaskParentChange,
      onReplaceDraftRow,
      parentUpdateFailedMessage: 'parent',
      queueKey: 'POG',
      rowId: 'feature-draft:1',
      selectedSprintId: 10,
      summary: 'Редизайн',
      tasks: [
        task({
          id: 'T-1',
          name: 'Работа',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
        task({
          id: 'local-1',
          isLocalTask: true,
          name: 'Черновик карточки',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
    });

    expect(result).toEqual({
      issueKey: 'ST-9',
      ok: true,
      task: expect.objectContaining({ id: 'ST-9' }),
    });
    expect(createIssueMock).toHaveBeenCalledWith({
      queue: 'POG',
      sprintId: 10,
      summary: 'Редизайн',
      type: 'story',
    });
    expect(updateIssueParentMock).toHaveBeenCalledWith('T-1', 'ST-9', 10);
    expect(onLocalTaskParentChange).toHaveBeenCalledWith('T-1', {
      display: 'Редизайн',
      id: 'ST-9',
      key: 'ST-9',
    });
    expect(onLocalTaskParentChange).toHaveBeenCalledWith('local-1', {
      display: 'Редизайн',
      id: 'ST-9',
      key: 'ST-9',
    });
    expect(onCommentParentChange).toHaveBeenCalledWith('c1', {
      display: 'Редизайн',
      id: 'ST-9',
      key: 'ST-9',
    });
    expect(onReplaceDraftRow).toHaveBeenCalledWith('feature-draft:1', {
      id: 'ST-9',
      name: 'Редизайн',
    });
    expect(onCreatedTask).toHaveBeenCalled();
  });

  it('переносит заметки и строку до ответа Трекера по детям', async () => {
    createIssueMock.mockResolvedValue({
      key: 'ST-9',
      success: true,
      task: task({ id: 'ST-9', name: 'Редизайн' }),
    });
    let releaseParentUpdate: ((value: boolean) => void) | undefined;
    updateIssueParentMock.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          releaseParentUpdate = resolve;
        })
    );
    const onCommentParentChange = vi.fn();
    const onCreatedTask = vi.fn();
    const onLocalTaskParentChange = vi.fn();
    const onReplaceDraftRow = vi.fn();
    const pending = submitConvertedFeatureLaneDraft({
      comments: [
        comment({
          id: 'c1',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
      createFailedMessage: 'fail',
      issueType: 'story',
      missingQueueMessage: 'queue',
      onCommentParentChange,
      onCreatedTask,
      onLocalTaskParentChange,
      onReplaceDraftRow,
      parentUpdateFailedMessage: 'parent',
      queueKey: 'POG',
      rowId: 'feature-draft:1',
      selectedSprintId: 10,
      summary: 'Редизайн',
      tasks: [
        task({
          id: 'T-1',
          name: 'Работа',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
    });

    await vi.waitFor(() => {
      expect(onReplaceDraftRow).toHaveBeenCalledWith('feature-draft:1', {
        id: 'ST-9',
        name: 'Редизайн',
      });
    });
    expect(onCommentParentChange).toHaveBeenCalledWith('c1', {
      display: 'Редизайн',
      id: 'ST-9',
      key: 'ST-9',
    });
    expect(onLocalTaskParentChange).toHaveBeenCalledWith('T-1', {
      display: 'Редизайн',
      id: 'ST-9',
      key: 'ST-9',
    });
    expect(onCreatedTask).toHaveBeenCalled();

    releaseParentUpdate?.(true);
    await expect(pending).resolves.toEqual({
      issueKey: 'ST-9',
      ok: true,
      task: expect.objectContaining({ id: 'ST-9' }),
    });
  });

  it('не ходит в Tracker без очереди', async () => {
    const result = await submitConvertedFeatureLaneDraft({
      comments: [],
      createFailedMessage: 'fail',
      issueType: 'epic',
      missingQueueMessage: 'queue',
      onCommentParentChange: vi.fn(),
      onCreatedTask: vi.fn(),
      onLocalTaskParentChange: vi.fn(),
      onReplaceDraftRow: vi.fn(),
      parentUpdateFailedMessage: 'parent',
      queueKey: '  ',
      rowId: 'feature-draft:1',
      selectedSprintId: 10,
      summary: 'Фича',
      tasks: [],
    });
    expect(result).toEqual({ error: 'queue', ok: false });
    expect(createIssueMock).not.toHaveBeenCalled();
  });
});

describe('submitCreatedFeatureLane', () => {
  beforeEach(() => {
    createIssueMock.mockReset();
  });

  it('создаёт задачу и закрепляет строку без переноса карточек', async () => {
    createIssueMock.mockResolvedValue({
      key: 'ST-9',
      success: true,
      task: task({ id: 'ST-9', name: 'Редизайн' }),
    });
    const onCreatedTask = vi.fn();
    const onPinTrackerRow = vi.fn();
    const result = await submitCreatedFeatureLane({
      createFailedMessage: 'fail',
      issueType: 'story',
      missingQueueMessage: 'queue',
      onCreatedTask,
      onPinTrackerRow,
      queueKey: 'POG',
      selectedSprintId: 10,
      summary: 'Редизайн',
    });
    expect(result).toEqual({
      issueKey: 'ST-9',
      ok: true,
      task: expect.objectContaining({ id: 'ST-9' }),
    });
    expect(onPinTrackerRow).toHaveBeenCalledWith({ id: 'ST-9', name: 'Редизайн' });
    expect(onCreatedTask).toHaveBeenCalled();
  });
});

describe('submitAttachedFeatureLane', () => {
  it('закрепляет выбранную задачу как строку фичи', () => {
    const onPinTrackerRow = vi.fn();
    const selectedTask = task({ id: 'EP-4', name: 'Онбординг' });
    const result = submitAttachedFeatureLane({
      emptyKeyMessage: 'empty',
      onPinTrackerRow,
      selectedTask,
    });
    expect(result).toEqual({ issueKey: 'EP-4', ok: true, task: selectedTask });
    expect(onPinTrackerRow).toHaveBeenCalledWith({ id: 'EP-4', name: 'Онбординг' });
  });
});

describe('submitExistingFeatureLaneDraft', () => {
  beforeEach(() => {
    createIssueMock.mockReset();
    updateIssueParentMock.mockReset();
    updateIssueParentMock.mockResolvedValue(true);
  });

  it('привязывает строку к задаче из Трекера без создания новой', async () => {
    const onCommentParentChange = vi.fn();
    const onLocalTaskParentChange = vi.fn();
    const onReplaceDraftRow = vi.fn();
    const selectedTask = task({ id: 'EP-4', name: 'Онбординг' });
    const result = await submitExistingFeatureLaneDraft({
      comments: [
        comment({
          id: 'c1',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
      onCommentParentChange,
      onLocalTaskParentChange,
      onReplaceDraftRow,
      parentUpdateFailedMessage: 'parent',
      rowId: 'feature-draft:1',
      selectedTask,
      tasks: [
        task({
          id: 'T-1',
          name: 'Работа',
          parent: { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' },
        }),
      ],
    });

    expect(result).toEqual({ issueKey: 'EP-4', ok: true, task: selectedTask });
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(updateIssueParentMock).toHaveBeenCalledWith('T-1', 'EP-4', undefined);
    expect(onCommentParentChange).toHaveBeenCalledWith('c1', {
      display: 'Онбординг',
      id: 'EP-4',
      key: 'EP-4',
    });
    expect(onReplaceDraftRow).toHaveBeenCalledWith('feature-draft:1', {
      id: 'EP-4',
      name: 'Онбординг',
    });
  });
});
