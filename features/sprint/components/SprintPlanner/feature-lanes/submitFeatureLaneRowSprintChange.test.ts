import type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';
import type { Comment, Task } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resolveFeatureLaneTransferRow,
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

function targetLanesIo(initial: FeatureLanesDocument | null) {
  const saved: FeatureLanesDocument[] = [];
  return {
    onLoadLanes: vi.fn().mockResolvedValue(initial),
    onSaveLanes: vi.fn((_sprintId: number, lanes: FeatureLanesDocument) => {
      saved.push(lanes);
      return Promise.resolve();
    }),
    saved,
  };
}

describe('submitMovedFeatureLane', () => {
  it('переносит задачи Трекера и заметки и закрепляет строку в целевом спринте', async () => {
    const onMoveToSprint = vi.fn().mockResolvedValue(undefined);
    const onMoveComments = vi.fn().mockResolvedValue(undefined);
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const io = targetLanesIo({
      draftRows: [{ id: 'feature-draft:7', name: 'Своя' }],
      hiddenIds: ['ST-9'],
      orderIds: ['feature-draft:7'],
    });
    const result = await submitMovedFeatureLane({
      ...io,
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
      transferRow: { id: 'ST-9', name: 'Стори' },
    });
    expect(result).toEqual({ ok: true });
    expect(onMoveToSprint).toHaveBeenCalledWith('T-1', 44);
    expect(onMoveToSprint).not.toHaveBeenCalledWith('local-work', 44);
    expect(onMoveComments).toHaveBeenCalledWith(['c-note'], 44);
    expect(io.onLoadLanes).toHaveBeenCalledWith(44);
    expect(io.onSaveLanes).toHaveBeenCalledWith(44, expect.anything());
    expect(io.saved).toEqual([
      {
        draftRows: [
          { id: 'feature-draft:7', name: 'Своя' },
          { id: 'ST-9', name: 'Стори' },
        ],
        hiddenIds: [],
        orderIds: ['feature-draft:7', 'ST-9'],
      },
    ]);
    expect(onCommentsLeftSprint).toHaveBeenCalledWith(['c-note']);
    expect(onRemoveBoardRow).toHaveBeenCalledWith('ST-9');
  });

  it('закрепляет строку Трекера даже без задач — только с заметками', async () => {
    const io = targetLanesIo(null);
    const result = await submitMovedFeatureLane({
      ...io,
      comments: [comment({ id: 'c-note', parent: storyParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint: vi.fn(),
      onMoveComments: vi.fn().mockResolvedValue(undefined),
      onMoveToSprint: vi.fn().mockResolvedValue(undefined),
      onRemoveBoardRow: vi.fn(),
      rowId: 'ST-9',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [],
      transferRow: { id: 'ST-9', name: 'Стори' },
    });
    expect(result).toEqual({ ok: true });
    expect(io.saved).toEqual([
      { draftRows: [{ id: 'ST-9', name: 'Стори' }], hiddenIds: [], orderIds: [] },
    ]);
  });

  it('не пишет документ, если строка уже есть в целевом спринте', async () => {
    const io = targetLanesIo({
      draftRows: [{ id: 'ST-9', name: 'Стори' }],
      hiddenIds: [],
      orderIds: [],
    });
    const result = await submitMovedFeatureLane({
      ...io,
      comments: [],
      failedMessage: 'failed',
      onCommentsLeftSprint: vi.fn(),
      onMoveComments: vi.fn(),
      onMoveToSprint: vi.fn().mockResolvedValue(undefined),
      onRemoveBoardRow: vi.fn(),
      rowId: 'ST-9',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [],
      transferRow: { id: 'ST-9', name: 'Стори' },
    });
    expect(result).toEqual({ ok: true });
    expect(io.onSaveLanes).not.toHaveBeenCalled();
  });

  it('не снимает заметки со строки, если перенос комментариев не удался', async () => {
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      ...targetLanesIo(null),
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
      transferRow: { id: 'ST-9', name: 'Стори' },
    });
    expect(result).toEqual({ error: 'failed', ok: false });
    expect(onCommentsLeftSprint).not.toHaveBeenCalled();
    expect(onRemoveBoardRow).not.toHaveBeenCalled();
  });

  it('переносит черновую строку вместе с issueKeys, задачами и заметками', async () => {
    const draftParent = { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' };
    const onMoveToSprint = vi.fn().mockResolvedValue(undefined);
    const onMoveComments = vi.fn().mockResolvedValue(undefined);
    const onCommentsLeftSprint = vi.fn();
    const onRemoveBoardRow = vi.fn();
    const io = targetLanesIo({ draftRows: [], hiddenIds: [], orderIds: ['ST-1'] });
    const result = await submitMovedFeatureLane({
      ...io,
      comments: [comment({ id: 'c-note', parent: draftParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onMoveComments,
      onMoveToSprint,
      onRemoveBoardRow,
      rowId: 'feature-draft:1',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [task({ id: 'T-1', name: 'Работа', parent: draftParent })],
      transferRow: { id: 'feature-draft:1', issueKeys: ['T-1'], name: 'Черновик' },
    });
    expect(result).toEqual({ ok: true });
    expect(onMoveToSprint).toHaveBeenCalledWith('T-1', 44);
    expect(onMoveComments).toHaveBeenCalledWith(['c-note'], 44);
    expect(io.saved).toEqual([
      {
        draftRows: [{ id: 'feature-draft:1', issueKeys: ['T-1'], name: 'Черновик' }],
        hiddenIds: [],
        orderIds: ['ST-1', 'feature-draft:1'],
      },
    ]);
    expect(onCommentsLeftSprint).toHaveBeenCalledWith(['c-note']);
    expect(onRemoveBoardRow).toHaveBeenCalledWith('feature-draft:1');
  });

  it('не переносит заметки и не снимает строку, если документ другого спринта не обновился', async () => {
    const onCommentsLeftSprint = vi.fn();
    const onMoveComments = vi.fn().mockResolvedValue(undefined);
    const onRemoveBoardRow = vi.fn();
    const result = await submitMovedFeatureLane({
      comments: [comment({ id: 'c-note', parent: storyParent })],
      failedMessage: 'failed',
      onCommentsLeftSprint,
      onLoadLanes: vi.fn().mockResolvedValue(null),
      onMoveComments,
      onMoveToSprint: vi.fn().mockResolvedValue(undefined),
      onRemoveBoardRow,
      onSaveLanes: vi.fn().mockRejectedValue(new Error('nope')),
      rowId: 'ST-9',
      sprintId: 12,
      targetSprintId: 44,
      tasks: [],
      transferRow: { id: 'ST-9', name: 'Стори' },
    });
    expect(result).toEqual({ error: 'failed', ok: false });
    expect(onMoveComments).not.toHaveBeenCalled();
    expect(onCommentsLeftSprint).not.toHaveBeenCalled();
    expect(onRemoveBoardRow).not.toHaveBeenCalled();
  });
});

describe('resolveFeatureLaneTransferRow', () => {
  const lanes: FeatureLanesDocument = {
    draftRows: [
      { id: 'feature-draft:1', issueKeys: ['T-1', 'T-2'], name: 'Черновик' },
      { id: 'ST-5', name: 'Закреп' },
    ],
    hiddenIds: [],
    orderIds: [],
  };
  const meta = new Map([['ST-9', { parent: storyParent }]]);

  it('берёт issueKeys и имя черновика', () => {
    expect(resolveFeatureLaneTransferRow('feature-draft:1', lanes, meta)).toEqual({
      id: 'feature-draft:1',
      issueKeys: ['T-1', 'T-2'],
      name: 'Черновик',
    });
  });

  it('для строки Трекера берёт имя закрепа, иначе родителя из проекции, иначе ключ', () => {
    expect(resolveFeatureLaneTransferRow('ST-5', lanes, meta)).toEqual({ id: 'ST-5', name: 'Закреп' });
    expect(resolveFeatureLaneTransferRow('ST-9', lanes, meta)).toEqual({ id: 'ST-9', name: 'Стори' });
    expect(resolveFeatureLaneTransferRow('ST-404', undefined, meta)).toEqual({
      id: 'ST-404',
      name: 'ST-404',
    });
  });
});
