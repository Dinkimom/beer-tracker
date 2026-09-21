import type { Comment, Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { completeQuickAddCommentDraft, submitQuickAddCommentDraft } from './submitQuickAddCommentDraft';

function comment(partial?: Partial<Comment>): Comment {
  return {
    assigneeId: 'dev-1',
    color: 'yellow',
    day: 1,
    height: 1,
    id: 'c1',
    part: 0,
    text: 'old',
    width: 2,
    x: 0,
    y: 0,
    ...partial,
  };
}

describe('submitQuickAddCommentDraft', () => {
  it('updates a saved note with text and color', () => {
    const onCommentUpdate = vi.fn();
    const closeNoteComposer = vi.fn();
    const result = submitQuickAddCommentDraft({
      closeNoteComposer,
      comments: [comment({ color: 'yellow' })],
      color: 'pink',
      defaultNote: 'Note',
      draftTitle: '  hello  ',
      onCommentCreate: vi.fn(),
      onCommentUpdate,
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'comment:c1',
      taskPositions: new Map(),
      tasks: [],
    });

    expect(result).toBe('updated');
    expect(onCommentUpdate).toHaveBeenCalledWith('c1', 'hello', 'pink');
    expect(closeNoteComposer).toHaveBeenCalledOnce();
  });

  it('creates a note from a local draft including the selected color', () => {
    const onCommentCreate = vi.fn();
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'comment',
      link: '#',
      name: 'draft',
      status: 'todo',
      stickyNoteColor: 'green',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 3,
      startDay: 2,
      startPart: 1,
      taskId: 'local-task-1',
    };

    const result = submitQuickAddCommentDraft({
      closeNoteComposer: vi.fn(),
      comments: [],
      color: 'blue',
      defaultNote: 'Note',
      onCommentCreate,
      onCommentUpdate: vi.fn(),
      setTaskPositions,
      setTasks,
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(result).toBe('created');
    expect(onCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: 'dev-2',
        color: 'blue',
        day: 2,
        height: 1,
        part: 1,
        text: 'draft',
        width: 3,
        y: 0,
      })
    );
    expect(setTasks).toHaveBeenCalledOnce();
    expect(setTaskPositions).toHaveBeenCalledOnce();
  });

  it('persists the user-set card row height instead of pairing it with width', () => {
    const onCommentCreate = vi.fn();
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'comment',
      link: '#',
      name: 'tall',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 5,
      startDay: 0,
      startPart: 0,
      taskId: 'local-task-1',
    };

    submitQuickAddCommentDraft({
      cardRowLayout: { layerShiftUp: 1, span: 3 },
      closeNoteComposer: vi.fn(),
      comments: [],
      defaultNote: 'Note',
      onCommentCreate,
      onCommentUpdate: vi.fn(),
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
    });

    expect(onCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        height: 3,
        width: 5,
        y: 1,
      })
    );
  });

  it('keeps a feature-draft parent and the selected person', () => {
    const onCommentCreate = vi.fn();
    const draftParent = {
      display: 'Черновик',
      id: 'feature-draft:1',
      key: 'feature-draft:1',
    };
    submitQuickAddCommentDraft({
      closeNoteComposer: vi.fn(),
      comments: [],
      defaultNote: 'Note',
      onCommentCreate,
      onCommentUpdate: vi.fn(),
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([
        [
          'local-task-1',
          { assignee: 'feature-draft:1', duration: 2, startDay: 0, startPart: 0, taskId: 'local-task-1' },
        ],
      ]),
      tasks: [
        {
          assignee: 'dev-3',
          id: 'local-task-1',
          isLocalTask: true,
          localDraftKind: 'comment',
          link: '#',
          name: 'on draft',
          parent: draftParent,
          status: 'todo',
          team: 'Back',
        } as Task,
      ],
    });

    expect(onCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: 'dev-3',
        parent: draftParent,
        text: 'on draft',
      })
    );
  });

  it('does not persist an empty note draft', () => {
    const onCommentCreate = vi.fn();
    const result = submitQuickAddCommentDraft({
      closeNoteComposer: vi.fn(),
      comments: [],
      defaultNote: 'Note',
      draftTitle: '   ',
      onCommentCreate,
      onCommentUpdate: vi.fn(),
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([
        [
          'local-task-1',
          { assignee: 'dev-2', duration: 2, startDay: 0, startPart: 0, taskId: 'local-task-1' },
        ],
      ]),
      tasks: [
        {
          id: 'local-task-1',
          isLocalTask: true,
          localDraftKind: 'comment',
          link: '#',
          name: '',
          status: 'todo',
          team: 'Back',
        } as Task,
      ],
    });

    expect(result).toBe('noop');
    expect(onCommentCreate).not.toHaveBeenCalled();
  });

  it('reads and clears the planner card-row override when completing a draft', () => {
    const onCommentCreate = vi.fn();
    const cardRowUi = {
      stickyNoteCardRowPreview: null,
      clearStickyNoteCardRowOverride: vi.fn(),
      clearStickyNoteCardRowPreview: vi.fn(),
      getStickyNoteCardRowOverride: vi.fn(() => ({ layerShiftUp: 0, span: 4 })),
    };
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      localDraftKind: 'comment',
      link: '#',
      name: 'sized',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 2,
      startDay: 0,
      startPart: 0,
      taskId: 'local-task-1',
    };

    completeQuickAddCommentDraft({
      cardRowUi,
      closeNoteComposer: vi.fn(),
      comments: [],
      createdMessage: 'created',
      defaultNote: 'Note',
      onCommentCreate,
      onCommentUpdate: vi.fn(),
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      taskId: 'local-task-1',
      taskPositions: new Map([['local-task-1', draftPosition]]),
      tasks: [draftTask],
      updatedMessage: 'updated',
    });

    expect(onCommentCreate).toHaveBeenCalledWith(expect.objectContaining({ height: 4, width: 2 }));
    expect(cardRowUi.clearStickyNoteCardRowOverride).toHaveBeenCalledWith('local-task-1');
    expect(cardRowUi.clearStickyNoteCardRowPreview).not.toHaveBeenCalled();
  });
});
