import type { Comment, Task } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  submitMovedFeatureLane,
  submitRemovedFeatureLane,
} from './submitFeatureLaneRowSprintChange';

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

const storyParent = { display: 'Стори', id: 'ST-9', key: 'ST-9' };

describe('submitRemovedFeatureLane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('удаляет заметки, локальные черновики и уносит задачи Трекера в бэклог', async () => {
    const onCommentDelete = vi.fn();
    const onDeleteAnnotationTask = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const onRemoveFromSprint = vi.fn().mockResolvedValue(undefined);
    const result = await submitRemovedFeatureLane({
      comments: [
        comment({ id: 'c-note', parent: storyParent }),
        comment({ id: 'c-other', parent: { display: 'Другая', id: 'ST-1', key: 'ST-1' } }),
      ],
      failedMessage: 'failed',
      onCommentDelete,
      onDeleteAnnotationTask,
      onRemoveBoardRow,
      onRemoveFromSprint,
      rowId: 'ST-9',
      sprintId: 12,
      tasks: [
        task({ id: 'T-1', name: 'Работа', parent: storyParent }),
        task({ id: 'ST-9', name: 'Стори' }),
        task({
          id: 'local-work',
          isLocalTask: true,
          localDraftKind: 'task',
          name: 'Черновик',
          parent: storyParent,
        }),
        task({
          id: 'local-image',
          isLocalTask: true,
          localDraftKind: 'image',
          name: 'Фото',
          parent: storyParent,
        }),
        task({ id: 'T-other', name: 'Чужая' }),
      ],
    });

    expect(result).toEqual({ ok: true });
    expect(onRemoveFromSprint).toHaveBeenCalledTimes(2);
    expect(onRemoveFromSprint).toHaveBeenCalledWith('T-1');
    expect(onRemoveFromSprint).toHaveBeenCalledWith('ST-9');
    expect(onDeleteAnnotationTask).toHaveBeenCalledWith('local-work');
    expect(onDeleteAnnotationTask).toHaveBeenCalledWith('local-image');
    expect(onCommentDelete).toHaveBeenCalledWith('c-note');
    expect(onCommentDelete).not.toHaveBeenCalledWith('c-other');
    expect(onRemoveBoardRow).toHaveBeenCalledWith('ST-9');
  });

  it('не трогает строку, если Tracker не убрал задачу', async () => {
    const onCommentDelete = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitRemovedFeatureLane({
      comments: [comment({ id: 'c1', parent: storyParent })],
      failedMessage: 'failed',
      onCommentDelete,
      onDeleteAnnotationTask: vi.fn(),
      onRemoveBoardRow,
      onRemoveFromSprint: vi.fn().mockRejectedValue(new Error('nope')),
      rowId: 'ST-9',
      sprintId: 12,
      tasks: [task({ id: 'T-1', name: 'Работа', parent: storyParent })],
    });
    expect(result).toEqual({ error: 'failed', ok: false });
    expect(onCommentDelete).not.toHaveBeenCalled();
    expect(onRemoveBoardRow).not.toHaveBeenCalled();
  });

  it('игнорирует черновые строки', async () => {
    const onRemoveFromSprint = vi.fn();
    const result = await submitRemovedFeatureLane({
      comments: [],
      failedMessage: 'failed',
      onCommentDelete: vi.fn(),
      onDeleteAnnotationTask: vi.fn(),
      onRemoveBoardRow: vi.fn(),
      onRemoveFromSprint,
      rowId: 'feature-draft:1',
      sprintId: 12,
      tasks: [],
    });
    expect(result).toEqual({ ok: true });
    expect(onRemoveFromSprint).not.toHaveBeenCalled();
  });
});

describe('submitMovedFeatureLane', () => {
  it('переносит задачи Трекера и заметки, не удаляя фото и схемы', async () => {
    const onMoveToSprint = vi.fn().mockResolvedValue(undefined);
    const onMoveComments = vi.fn().mockResolvedValue(undefined);
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      comments: [comment({ id: 'c-note', parent: storyParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onMoveComments,
      onMoveToSprint,
      onRemoveBoardRow,
      rowId: 'ST-9',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [
        task({ id: 'T-1', name: 'Работа', parent: storyParent }),
        task({
          id: 'local-image',
          isLocalTask: true,
          localDraftKind: 'image',
          name: 'Фото',
          parent: storyParent,
        }),
        task({
          id: 'local-work',
          isLocalTask: true,
          localDraftKind: 'task',
          name: 'Черновик',
          parent: storyParent,
        }),
      ],
    });
    expect(result).toEqual({ ok: true });
    expect(onMoveToSprint).toHaveBeenCalledWith('T-1', 44);
    expect(onMoveToSprint).not.toHaveBeenCalledWith('local-work', 44);
    expect(onMoveComments).toHaveBeenCalledWith(['c-note'], 44);
    expect(onCommentsLeftSprint).toHaveBeenCalledWith(['c-note']);
    expect(onRemoveBoardRow).toHaveBeenCalledWith('ST-9');
  });

  it('не снимает заметки со строки, если перенос комментариев не удался', async () => {
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      comments: [comment({ id: 'c-note', parent: storyParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onMoveComments: vi.fn().mockRejectedValue(new Error('nope')),
      onMoveToSprint: vi.fn().mockResolvedValue(undefined),
      onRemoveBoardRow,
      rowId: 'ST-9',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [task({ id: 'T-1', name: 'Работа', parent: storyParent })],
    });
    expect(result).toEqual({ error: 'failed', ok: false });
    expect(onCommentsLeftSprint).not.toHaveBeenCalled();
    expect(onRemoveBoardRow).not.toHaveBeenCalled();
  });

  it('переносит черновую строку вместе с задачами и заметками', async () => {
    const draftParent = { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' };
    const onMoveToSprint = vi.fn().mockResolvedValue(undefined);
    const onMoveComments = vi.fn().mockResolvedValue(undefined);
    const onTransferDraftRow = vi.fn().mockResolvedValue(undefined);
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      comments: [comment({ id: 'c-note', parent: draftParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onMoveComments,
      onMoveToSprint,
      onRemoveBoardRow,
      onTransferDraftRow,
      rowId: 'feature-draft:1',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [task({ id: 'T-1', name: 'Работа', parent: draftParent })],
    });
    expect(result).toEqual({ ok: true });
    expect(onMoveToSprint).toHaveBeenCalledWith('T-1', 44);
    expect(onMoveComments).toHaveBeenCalledWith(['c-note'], 44);
    expect(onTransferDraftRow).toHaveBeenCalledWith('feature-draft:1', 44);
    expect(onCommentsLeftSprint).toHaveBeenCalledWith(['c-note']);
    expect(onRemoveBoardRow).toHaveBeenCalledWith('feature-draft:1');
  });

  it('не снимает черновик, если документ другого спринта не обновился', async () => {
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      comments: [],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onMoveComments: vi.fn().mockResolvedValue(undefined),
      onMoveToSprint: vi.fn().mockResolvedValue(undefined),
      onRemoveBoardRow,
      onTransferDraftRow: vi.fn().mockRejectedValue(new Error('nope')),
      rowId: 'feature-draft:1',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [],
    });
    expect(result).toEqual({ error: 'failed', ok: false });
    expect(onCommentsLeftSprint).not.toHaveBeenCalled();
    expect(onRemoveBoardRow).not.toHaveBeenCalled();
  });
});
