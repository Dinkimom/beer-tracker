import type { Comment, Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  collectFeatureLaneRowComments,
  collectFeatureLaneRowWorkTasks,
  deleteFeatureLaneRowAnnotations,
  isFeatureLaneAnnotationTask,
  isOnFeatureLaneCommentRow,
  isOnFeatureLaneRow,
} from './featureLaneRowItems';

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

describe('featureLaneRowItems', () => {
  it('считает заметки, картинки и схемы аннотациями', () => {
    expect(isFeatureLaneAnnotationTask({ id: 't', localDraftKind: 'comment' })).toBe(true);
    expect(isFeatureLaneAnnotationTask({ id: 't', localDraftKind: 'diagram' })).toBe(true);
    expect(isFeatureLaneAnnotationTask({ id: 'local-image:1' })).toBe(true);
    expect(isFeatureLaneAnnotationTask({ id: 'T-1', localDraftKind: 'task' })).toBe(false);
  });

  it('относит к строке детей по parent/epic и сам родительский issue', () => {
    expect(isOnFeatureLaneRow('ST-9', task({ id: 'T-1', name: 'Работа', parent: storyParent }))).toBe(
      true
    );
    expect(
      isOnFeatureLaneRow(
        'ST-9',
        task({
          id: 'T-1',
          name: 'Работа',
          parent: { display: 'Стори', id: '10026', key: 'ST-9' },
        })
      )
    ).toBe(true);
    expect(
      isOnFeatureLaneRow('EP-1', task({ id: 'T-2', name: 'Работа', epic: { display: 'Эпик', id: 'EP-1', key: 'EP-1' } }))
    ).toBe(true);
    expect(isOnFeatureLaneRow('ST-9', task({ id: 'ST-9', name: 'Сама стори' }))).toBe(true);
    expect(isOnFeatureLaneRow('ST-9', task({ id: 'T-other', name: 'Чужая' }))).toBe(false);
  });

  it('относит заметки к строке по parent или assigneeId', () => {
    expect(isOnFeatureLaneCommentRow('ST-9', comment({ id: 'c1', parent: storyParent }))).toBe(true);
    expect(isOnFeatureLaneCommentRow('ST-9', comment({ assigneeId: 'ST-9', id: 'c2' }))).toBe(true);
    expect(
      isOnFeatureLaneCommentRow(
        'ST-9',
        comment({ id: 'c-tracker', parent: { display: 'Стори', id: '10026', key: 'ST-9' } })
      )
    ).toBe(true);
    expect(isOnFeatureLaneCommentRow('ST-9', comment({ id: 'c3' }))).toBe(false);
  });

  it('собирает заметки строки по parent или assigneeId', () => {
    const comments = [
      comment({ id: 'c-note', parent: storyParent }),
      comment({ assigneeId: 'ST-9', id: 'c-on-row' }),
      comment({ id: 'c-other', parent: { display: 'Другая', id: 'ST-1', key: 'ST-1' } }),
    ];
    expect(collectFeatureLaneRowComments('ST-9', comments).map((item) => item.id)).toEqual([
      'c-note',
      'c-on-row',
    ]);
  });

  it('собирает только рабочие задачи строки, без заметок', () => {
    const tasks = [
      task({ id: 'T-1', name: 'Работа', parent: storyParent }),
      task({ id: 'ST-9', name: 'Стори' }),
      task({
        id: 'local-image',
        isLocalTask: true,
        localDraftKind: 'image',
        name: 'Фото',
        parent: storyParent,
      }),
      task({ id: 'comment:c-note', localDraftKind: 'comment', name: 'Заметка', parent: storyParent }),
      task({ id: 'T-other', name: 'Чужая' }),
    ];
    expect(collectFeatureLaneRowWorkTasks('ST-9', tasks).map((item) => item.id)).toEqual([
      'T-1',
      'ST-9',
    ]);
  });

  it('удаляет заметки и аннотации строки', () => {
    const onCommentDelete = vi.fn();
    const onDeleteAnnotationTask = vi.fn();
    deleteFeatureLaneRowAnnotations({
      comments: [
        comment({ id: 'c-note', parent: storyParent }),
        comment({ id: 'c-other', parent: { display: 'Другая', id: 'ST-1', key: 'ST-1' } }),
      ],
      onCommentDelete,
      onDeleteAnnotationTask,
      rowId: 'ST-9',
      tasks: [
        task({
          id: 'local-diagram',
          isLocalTask: true,
          localDraftKind: 'diagram',
          name: 'Схема',
          parent: storyParent,
        }),
        task({ id: 'T-1', name: 'Работа', parent: storyParent }),
      ],
    });
    expect(onCommentDelete).toHaveBeenCalledWith('c-note');
    expect(onCommentDelete).not.toHaveBeenCalledWith('c-other');
    expect(onDeleteAnnotationTask).toHaveBeenCalledWith('local-diagram');
    expect(onDeleteAnnotationTask).not.toHaveBeenCalledWith('T-1');
  });
});
