import type { Comment, Task, TaskPosition } from '@/types';

import toast from 'react-hot-toast';
import { describe, expect, it, vi } from 'vitest';

import { getPlannerDiagramScene } from '@/lib/comments/plannerDiagramPreviewStore';

import { completeQuickAddDiagramDraft, submitQuickAddDiagramDraft } from './submitQuickAddDiagramDraft';

describe('submitQuickAddDiagramDraft', () => {
  it('creates a local diagram comment with the name in text', async () => {
    const onCommentCreate = vi.fn();
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'diagram',
      link: '#',
      name: '',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 2,
      startDay: 1,
      startPart: 0,
      taskId: 'local-task-1',
    };

    const result = await submitQuickAddDiagramDraft({
      comments: [],
      diagramName: 'Architecture',
      onCommentCreate,
      selectedSprintId: null,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(result.type).toBe('created');
    expect(onCommentCreate).toHaveBeenCalledOnce();
    const created = onCommentCreate.mock.calls[0]?.[0] as Comment;
    expect(created.kind).toBe('diagram');
    expect(created.text).toBe('Architecture');
    expect(created.width).toBe(2);
    expect(created.height).toBe(2);
    expect(created.assigneeId).toBe('dev-2');
  });

  it('persists a diagram comment through the API when a sprint is selected', async () => {
    const onCommentCreate = vi.fn();
    const created: Comment = {
      assigneeId: 'dev-2',
      day: 1,
      diagramUrl: '/api/sprints/9/comments/c-new/diagram',
      height: 2,
      id: 'c-new',
      kind: 'diagram',
      part: 0,
      text: 'Architecture',
      width: 2,
      x: 0,
      y: 0,
    };
    const createDiagramComment = vi.fn().mockResolvedValue(created);
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'diagram',
      link: '#',
      name: '',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 2,
      startDay: 1,
      startPart: 0,
      taskId: 'local-task-1',
    };

    const result = await submitQuickAddDiagramDraft({
      comments: [],
      createDiagramComment,
      diagramName: 'Architecture',
      onCommentCreate,
      selectedSprintId: 9,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(result).toEqual({ commentId: 'c-new', type: 'created' });
    expect(createDiagramComment).toHaveBeenCalledWith({
      assigneeId: 'dev-2',
      day: 1,
      height: 2,
      name: 'Architecture',
      part: 0,
      width: 2,
    });
    expect(onCommentCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-new', kind: 'diagram' }));
  });

  it('opens the diagram editor after creating a draft', async () => {
    const onDiagramEditorOpen = vi.fn();
    const toastSuccess = vi.fn();
    const toastSpy = vi.spyOn(toast, 'success').mockImplementation(toastSuccess);
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'diagram',
      link: '#',
      name: '',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 2,
      startDay: 1,
      startPart: 0,
      taskId: 'local-task-1',
    };

    await completeQuickAddDiagramDraft({
      comments: [],
      createdMessage: 'created',
      diagramName: 'Architecture',
      failedMessage: 'failed',
      onCommentCreate: vi.fn(),
      onDiagramEditorClose: vi.fn(),
      onDiagramEditorOpen,
      selectedSprintId: null,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(toastSuccess).toHaveBeenCalledWith('created');
    expect(onDiagramEditorOpen).toHaveBeenCalledOnce();
    expect(onDiagramEditorOpen).toHaveBeenCalledWith(expect.stringMatching(/^comment:/));
    const createdId = onDiagramEditorOpen.mock.calls[0]?.[0]?.replace(/^comment:/, '');
    expect(getPlannerDiagramScene(createdId ?? '')?.name).toBe('Architecture');
    toastSpy.mockRestore();
  });

  it('closes the editor when diagram create fails', async () => {
    const onDiagramEditorClose = vi.fn();
    const onDiagramEditorOpen = vi.fn();
    const toastError = vi.spyOn(toast, 'error').mockImplementation(vi.fn());
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'diagram',
      link: '#',
      name: '',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 2,
      startDay: 1,
      startPart: 0,
      taskId: 'local-task-1',
    };

    await completeQuickAddDiagramDraft({
      comments: [],
      createDiagramComment: () => Promise.resolve(null),
      createdMessage: 'created',
      failedMessage: 'failed',
      onCommentCreate: vi.fn(),
      onDiagramEditorClose,
      onDiagramEditorOpen,
      selectedSprintId: 9,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(onDiagramEditorOpen).not.toHaveBeenCalled();
    expect(onDiagramEditorClose).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('failed');
    toastError.mockRestore();
  });

  it('returns existing when the card is already a saved comment', async () => {
    const comments: Comment[] = [
      {
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c1',
        part: 0,
        text: 'x',
        width: 2,
        x: 0,
        y: 0,
      },
    ];
    const result = await submitQuickAddDiagramDraft({
      comments,
      onCommentCreate: vi.fn(),
      selectedSprintId: null,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'comment:c1',
      taskPositions: new Map(),
      tasks: [],
    });
    expect(result).toEqual({ commentId: 'c1', type: 'existing' });
  });
});
