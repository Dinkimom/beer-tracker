import type { Comment, Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { submitQuickAddImageDraft } from './submitQuickAddImageDraft';

vi.mock('@/features/task/utils/compressPlannerImageFile', () => ({
  compressPlannerImageFile: vi.fn((file: File) => Promise.resolve(file)),
}));

vi.mock('@/features/task/utils/localPlannerImageFile', () => ({
  fileFromPlannerImageObjectUrl: vi.fn(() =>
    Promise.resolve(new File([new Uint8Array(8)], 'photo.jpg', { type: 'image/jpeg' }))
  ),
  revokeLocalPlannerImageObjectUrl: vi.fn(),
}));

const draftTask = {
  id: 'local-task-1',
  isLocalTask: true,
  link: '#',
  localDraftKind: 'image',
  name: 'caption',
  status: 'todo',
  team: 'Back',
} as Task;

const draftPosition: TaskPosition = {
  assignee: 'dev-1',
  duration: 2,
  startDay: 1,
  startPart: 0,
  taskId: 'local-task-1',
};

describe('submitQuickAddImageDraft', () => {
  it('commits a local photo card when there is no sprint', async () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();

    const result = await submitQuickAddImageDraft({
      caption: '  Polaroid  ',
      imageUrl: 'blob:photo',
      selectedSprintId: null,
      setTaskPositions,
      setTasks,
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(result).toBe('created');
    const nextTasks = setTasks.mock.calls[0][0]([draftTask]);
    expect(nextTasks[0]).toMatchObject({
      imageUrl: 'blob:photo',
      localDraftKind: 'image',
      name: 'Polaroid',
    });
    expect(nextTasks[0].id).toMatch(/^local-image:/);
  });

  it('keeps the resized height on a local photo card after commit', async () => {
    const setStickyNoteCardRowOverride = vi.fn();
    const cardRowUi = {
      stickyNoteCardRowPreview: null,
      clearStickyNoteCardRowOverride: vi.fn(),
      clearStickyNoteCardRowPreview: vi.fn(),
      getStickyNoteCardRowOverride: vi.fn(() => ({ layerShiftUp: 0, span: 4 })),
      setStickyNoteCardRowOverride,
    };

    await submitQuickAddImageDraft({
      caption: 'Polaroid',
      cardRowUi,
      imageUrl: 'blob:photo',
      selectedSprintId: null,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(setStickyNoteCardRowOverride).toHaveBeenCalledWith(
      expect.stringMatching(/^local-image:/),
      { layerShiftUp: 0, span: 4 }
    );
    expect(cardRowUi.clearStickyNoteCardRowOverride).toHaveBeenCalledWith('local-task-1');
  });

  it('persists a photo comment and drops the draft', async () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const onCommentCreate = vi.fn();
    const created = {
      assigneeId: 'dev-1',
      day: 1,
      height: 1,
      id: 'comment-uuid',
      imageUrl: '/api/sprints/1/comments/comment-uuid/image',
      kind: 'image',
      part: 0,
      text: 'Polaroid',
      width: 2,
      x: 0,
      y: 0,
    } as Comment;

    const createImageComment = vi.fn().mockResolvedValue(created);
    const result = await submitQuickAddImageDraft({
      caption: 'Polaroid',
      createImageComment,
      imageUrl: 'blob:photo',
      onCommentCreate,
      selectedSprintId: 12,
      setTaskPositions,
      setTasks,
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(result).toBe('created');
    expect(createImageComment).toHaveBeenCalledWith(
      expect.objectContaining({ height: 2, width: 2 })
    );
    expect(onCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'comment-uuid', kind: 'image' })
    );
    const nextTasks = setTasks.mock.calls[0][0]([draftTask]);
    expect(nextTasks).toEqual([]);
  });

  it('does not pair photo card height with a wider draft duration', async () => {
    const createImageComment = vi.fn().mockResolvedValue({
      assigneeId: 'dev-1',
      day: 1,
      height: 2,
      id: 'comment-uuid',
      kind: 'image',
      part: 0,
      text: 'Wide',
      width: 4,
      x: 0,
      y: 0,
    } as Comment);

    await submitQuickAddImageDraft({
      caption: 'Wide',
      createImageComment,
      imageUrl: 'blob:photo',
      onCommentCreate: vi.fn(),
      selectedSprintId: 12,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([
        ['local-task-1', { ...draftPosition, duration: 4 }],
      ]),
      tasks: [draftTask],
    });

    expect(createImageComment).toHaveBeenCalledWith(
      expect.objectContaining({ height: 2, width: 4 })
    );
  });

  it('persists the user-set card row height instead of the default', async () => {
    const createImageComment = vi.fn().mockResolvedValue({
      assigneeId: 'dev-1',
      day: 1,
      height: 4,
      id: 'comment-uuid',
      kind: 'image',
      part: 0,
      text: 'Tall',
      width: 2,
      x: 0,
      y: 0,
    } as Comment);

    await submitQuickAddImageDraft({
      caption: 'Tall',
      cardRowLayout: { layerShiftUp: 1, span: 4 },
      createImageComment,
      imageUrl: 'blob:photo',
      onCommentCreate: vi.fn(),
      selectedSprintId: 12,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(createImageComment).toHaveBeenCalledWith(
      expect.objectContaining({ height: 4, width: 2 })
    );
  });

  it('reads the planner card-row override when completing a draft', async () => {
    const createImageComment = vi.fn().mockResolvedValue({
      assigneeId: 'dev-1',
      day: 1,
      height: 3,
      id: 'comment-uuid',
      kind: 'image',
      part: 0,
      text: 'Sized',
      width: 2,
      x: 0,
      y: 0,
    } as Comment);
    const cardRowUi = {
      stickyNoteCardRowPreview: null,
      clearStickyNoteCardRowOverride: vi.fn(),
      clearStickyNoteCardRowPreview: vi.fn(),
      getStickyNoteCardRowOverride: vi.fn(() => ({ layerShiftUp: 0, span: 3 })),
      setStickyNoteCardRowOverride: vi.fn(),
    };

    await submitQuickAddImageDraft({
      caption: 'Sized',
      cardRowUi,
      createImageComment,
      imageUrl: 'blob:photo',
      onCommentCreate: vi.fn(),
      selectedSprintId: 12,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(createImageComment).toHaveBeenCalledWith(
      expect.objectContaining({ height: 3, width: 2 })
    );
    expect(cardRowUi.clearStickyNoteCardRowOverride).not.toHaveBeenCalled();
    expect(cardRowUi.clearStickyNoteCardRowPreview).not.toHaveBeenCalled();
  });

  it('keeps the resized height while the photo is uploading', async () => {
    let resolveCreate: ((comment: Comment) => void) | undefined;
    const createImageComment = vi.fn(
      () =>
        new Promise<Comment>((resolve) => {
          resolveCreate = resolve;
        })
    );
    const cardRowUi = {
      stickyNoteCardRowPreview: null,
      clearStickyNoteCardRowOverride: vi.fn(),
      clearStickyNoteCardRowPreview: vi.fn(),
      getStickyNoteCardRowOverride: vi.fn(() => ({ layerShiftUp: 0, span: 4 })),
      setStickyNoteCardRowOverride: vi.fn(),
    };

    const pending = submitQuickAddImageDraft({
      caption: 'Uploading',
      cardRowUi,
      createImageComment,
      imageUrl: 'blob:photo',
      onCommentCreate: vi.fn(),
      selectedSprintId: 12,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(createImageComment).toHaveBeenCalledWith(
      expect.objectContaining({ height: 4, width: 2 })
    );
    expect(cardRowUi.clearStickyNoteCardRowOverride).not.toHaveBeenCalled();

    resolveCreate?.({
      assigneeId: 'dev-1',
      day: 1,
      height: 4,
      id: 'comment-uuid',
      kind: 'image',
      part: 0,
      text: 'Uploading',
      width: 2,
      x: 0,
      y: 0,
    } as Comment);
    await pending;

    expect(cardRowUi.clearStickyNoteCardRowOverride).not.toHaveBeenCalled();
  });

  it('returns failed when the comments API cannot persist the photo', async () => {
    const cardRowUi = {
      stickyNoteCardRowPreview: null,
      clearStickyNoteCardRowOverride: vi.fn(),
      clearStickyNoteCardRowPreview: vi.fn(),
      getStickyNoteCardRowOverride: vi.fn(() => ({ layerShiftUp: 0, span: 4 })),
      setStickyNoteCardRowOverride: vi.fn(),
    };
    expect(
      await submitQuickAddImageDraft({
        caption: 'Polaroid',
        cardRowUi,
        createImageComment: vi.fn().mockResolvedValue(null),
        imageUrl: 'blob:photo',
        onCommentCreate: vi.fn(),
        selectedSprintId: 12,
        setTaskPositions: vi.fn(),
        setTasks: vi.fn(),
        taskId: 'local-task-1',
        taskPositions: new Map([['local-task-1', draftPosition]]),
        tasks: [draftTask],
      })
    ).toBe('failed');
    expect(cardRowUi.clearStickyNoteCardRowOverride).not.toHaveBeenCalled();
  });

  it('does nothing without an image or draft', async () => {
    expect(
      await submitQuickAddImageDraft({
        imageUrl: '',
        selectedSprintId: null,
        setTaskPositions: vi.fn(),
        setTasks: vi.fn(),
        taskId: 'local-task-1',
        taskPositions: new Map(),
        tasks: [],
      })
    ).toBe('noop');
  });
});
