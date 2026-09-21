import type { Comment, Task } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateIssueParent } from '@/lib/api/issues';

import { submitDeletedFeatureLaneDraft } from './submitDeletedFeatureLaneDraft';

vi.mock('@/lib/api/issues', () => ({
  updateIssueParent: vi.fn(),
}));

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

const draftParent = { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' };

describe('submitDeletedFeatureLaneDraft', () => {
  beforeEach(() => {
    updateIssueParentMock.mockReset();
    updateIssueParentMock.mockResolvedValue(true);
  });

  it('удаляет заметки, картинки и схемы, задачи переносит в без родителя', async () => {
    const onClearTaskParent = vi.fn();
    const onCommentDelete = vi.fn();
    const onDeleteAnnotationTask = vi.fn();
    const onRemoveDraftRow = vi.fn();
    const result = await submitDeletedFeatureLaneDraft({
      comments: [
        comment({ id: 'c-note', parent: draftParent }),
        comment({ id: 'c-image', kind: 'image', parent: draftParent }),
        comment({ id: 'c-other', parent: { display: 'Другая', id: 'ST-1', key: 'ST-1' } }),
      ],
      onClearTaskParent,
      onCommentDelete,
      onDeleteAnnotationTask,
      onRemoveDraftRow,
      parentUpdateFailedMessage: 'parent',
      rowId: 'feature-draft:1',
      tasks: [
        task({ id: 'T-1', name: 'Работа', parent: draftParent }),
        task({
          id: 'local-work',
          isLocalTask: true,
          localDraftKind: 'task',
          name: 'Черновик задачи',
          parent: draftParent,
        }),
        task({
          id: 'local-image',
          isLocalTask: true,
          localDraftKind: 'image',
          name: 'Фото',
          parent: draftParent,
        }),
        task({
          id: 'local-diagram',
          isLocalTask: true,
          localDraftKind: 'diagram',
          name: 'Схема',
          parent: draftParent,
        }),
        task({
          id: 'comment:c-note',
          localDraftKind: 'comment',
          name: 'Заметка',
          parent: draftParent,
        }),
        task({ id: 'T-other', name: 'Чужая', parent: { display: 'Другая', id: 'ST-1', key: 'ST-1' } }),
      ],
    });

    expect(result).toEqual({ ok: true });
    expect(updateIssueParentMock).toHaveBeenCalledTimes(1);
    expect(updateIssueParentMock).toHaveBeenCalledWith('T-1', null);
    expect(onClearTaskParent).toHaveBeenCalledWith('T-1');
    expect(onClearTaskParent).toHaveBeenCalledWith('local-work');
    expect(onClearTaskParent).not.toHaveBeenCalledWith('local-image');
    expect(onCommentDelete).toHaveBeenCalledWith('c-note');
    expect(onCommentDelete).toHaveBeenCalledWith('c-image');
    expect(onCommentDelete).not.toHaveBeenCalledWith('c-other');
    expect(onDeleteAnnotationTask).toHaveBeenCalledWith('local-image');
    expect(onDeleteAnnotationTask).toHaveBeenCalledWith('local-diagram');
    expect(onDeleteAnnotationTask).not.toHaveBeenCalledWith('comment:c-note');
    expect(onRemoveDraftRow).toHaveBeenCalledWith('feature-draft:1');
  });

  it('не удаляет строку, если Tracker не снял родителя', async () => {
    updateIssueParentMock.mockResolvedValue(false);
    const onRemoveDraftRow = vi.fn();
    const onCommentDelete = vi.fn();
    const result = await submitDeletedFeatureLaneDraft({
      comments: [comment({ id: 'c1', parent: draftParent })],
      onClearTaskParent: vi.fn(),
      onCommentDelete,
      onDeleteAnnotationTask: vi.fn(),
      onRemoveDraftRow,
      parentUpdateFailedMessage: 'parent',
      rowId: 'feature-draft:1',
      tasks: [task({ id: 'T-1', name: 'Работа', parent: draftParent })],
    });
    expect(result).toEqual({ error: 'parent', ok: false });
    expect(onCommentDelete).not.toHaveBeenCalled();
    expect(onRemoveDraftRow).not.toHaveBeenCalled();
  });

  it('игнорирует строки, которые уже не драфт', async () => {
    const onRemoveDraftRow = vi.fn();
    const result = await submitDeletedFeatureLaneDraft({
      comments: [],
      onClearTaskParent: vi.fn(),
      onCommentDelete: vi.fn(),
      onDeleteAnnotationTask: vi.fn(),
      onRemoveDraftRow,
      parentUpdateFailedMessage: 'parent',
      rowId: 'ST-9',
      tasks: [],
    });
    expect(result).toEqual({ ok: true });
    expect(onRemoveDraftRow).not.toHaveBeenCalled();
    expect(updateIssueParentMock).not.toHaveBeenCalled();
  });
});
