import type { Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { pasteNoteAtSwimlaneCell, pasteQuickAddNoteDraft } from './pasteQuickAddNoteDraft';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
}));

describe('pasteQuickAddNoteDraft', () => {
  it('creates a note from the clipboard at the draft cell and drops the draft', () => {
    const onCommentCreate = vi.fn();
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const draftTask = {
      id: 'local-task-1',
      isLocalTask: true,
      link: '#',
      name: '',
      status: 'todo',
      team: 'Back',
    } as Task;
    const draftPosition: TaskPosition = {
      assignee: 'dev-2',
      duration: 1,
      startDay: 3,
      startPart: 2,
      taskId: 'local-task-1',
    };

    const result = pasteQuickAddNoteDraft({
      clipboard: { color: 'green', height: 3, text: 'Copied', width: 4 },
      createdMessage: 'pasted',
      onCommentCreate,
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
        color: 'green',
        day: 3,
        height: 3,
        part: 2,
        skipMentionNotifications: true,
        text: 'Copied',
        width: 4,
        y: 0,
      })
    );
    expect(setTasks).toHaveBeenCalledOnce();
    expect(setTaskPositions).toHaveBeenCalledOnce();
  });

  it('pastes a note at a cell without creating a draft', () => {
    const onCommentCreate = vi.fn();
    pasteNoteAtSwimlaneCell({
      assigneeId: 'dev-3',
      clipboard: { color: 'yellow', height: 2, text: 'Copied', width: 2 },
      createdMessage: 'pasted',
      day: 1,
      onCommentCreate,
      part: 0,
    });
    expect(onCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: 'dev-3',
        day: 1,
        part: 0,
        skipMentionNotifications: true,
        text: 'Copied',
      })
    );
  });

  it('does nothing without a local draft cell', () => {
    expect(
      pasteQuickAddNoteDraft({
        clipboard: { color: 'yellow', height: 2, text: 'Copied', width: 2 },
        createdMessage: 'pasted',
        onCommentCreate: vi.fn(),
        setTaskPositions: vi.fn(),
        setTasks: vi.fn(),
        taskId: 'local-task-1',
        taskPositions: new Map(),
        tasks: [],
      })
    ).toBe('noop');
  });
});
