import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  cancelLocalCommentCreateDraftIfLeftCommentTool,
  cancelLocalDiagramCreateDraftIfLeftDiagramTool,
  cancelLocalImageCreateDraftIfLeftImageTool,
  findLocalCommentCreateDraftId,
  findLocalDiagramCreateDraftId,
  findLocalImageCreateDraftId,
} from './cancelQuickAddDraft';

function draftNote(): Task {
  return {
    id: 'local-task-1',
    isLocalTask: true,
    localDraftKind: 'comment',
    link: '#',
    name: 'Draft',
    status: 'todo',
    team: 'Back',
  };
}

describe('findLocalCommentCreateDraftId', () => {
  it('finds a local note draft and ignores saved notes', () => {
    expect(
      findLocalCommentCreateDraftId([
        { id: 'comment:1', localDraftKind: 'comment', link: '#', name: 'Saved', team: 'Back' },
        draftNote(),
      ])
    ).toBe('local-task-1');
    expect(findLocalCommentCreateDraftId([])).toBeUndefined();
  });
});

describe('cancelLocalCommentCreateDraftIfLeftCommentTool', () => {
  it('does not remove a note draft while another tool stays active', () => {
    const setTasks = vi.fn();
    cancelLocalCommentCreateDraftIfLeftCommentTool({
      closeNoteComposer: vi.fn(),
      placementTool: 'task',
      previousTool: 'task',
      setTaskPositions: vi.fn(),
      setTasks,
      tasks: [draftNote()],
    });
    expect(setTasks).not.toHaveBeenCalled();
  });

  it('keeps the draft while the note tool stays selected', () => {
    const setTasks = vi.fn();
    cancelLocalCommentCreateDraftIfLeftCommentTool({
      closeNoteComposer: vi.fn(),
      placementTool: 'comment',
      previousTool: 'comment',
      setTaskPositions: vi.fn(),
      setTasks,
      tasks: [draftNote()],
    });
    expect(setTasks).not.toHaveBeenCalled();
  });

  it('discards the in-progress note when leaving the note tool', () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const clearStickyNoteCardRowOverride = vi.fn();
    cancelLocalCommentCreateDraftIfLeftCommentTool({
      clearStickyNoteCardRowOverride,
      closeNoteComposer: vi.fn(),
      placementTool: 'cursor',
      previousTool: 'comment',
      setTaskPositions,
      setTasks,
      tasks: [draftNote()],
    });

    const nextTasks = setTasks.mock.calls[0][0]([
      draftNote(),
      { id: 'DEV-1' } as Task,
    ]) as Task[];
    expect(nextTasks.map((task) => task.id)).toEqual(['DEV-1']);
    expect(clearStickyNoteCardRowOverride).toHaveBeenCalledWith('local-task-1');
  });
});

function draftPhoto(): Task {
  return {
    id: 'local-task-photo',
    isLocalTask: true,
    localDraftKind: 'image',
    link: '#',
    name: '',
    status: 'todo',
    team: 'Back',
  };
}

describe('findLocalImageCreateDraftId', () => {
  it('finds a local photo draft and ignores saved photos', () => {
    expect(
      findLocalImageCreateDraftId([
        { id: 'local-image:1', localDraftKind: 'image', link: '#', name: 'Saved', team: 'Back' },
        draftPhoto(),
      ])
    ).toBe('local-task-photo');
    expect(findLocalImageCreateDraftId([])).toBeUndefined();
  });
});

describe('cancelLocalImageCreateDraftIfLeftImageTool', () => {
  it('does not remove a chooser photo draft while the task tool is active', () => {
    const setTasks = vi.fn();
    cancelLocalImageCreateDraftIfLeftImageTool({
      closeNoteComposer: vi.fn(),
      placementTool: 'task',
      previousTool: 'task',
      setTaskPositions: vi.fn(),
      setTasks,
      tasks: [draftPhoto()],
    });
    expect(setTasks).not.toHaveBeenCalled();
  });

  it('keeps the draft while the photo tool stays selected', () => {
    const setTasks = vi.fn();
    cancelLocalImageCreateDraftIfLeftImageTool({
      closeNoteComposer: vi.fn(),
      placementTool: 'image',
      previousTool: 'image',
      setTaskPositions: vi.fn(),
      setTasks,
      tasks: [draftPhoto()],
    });
    expect(setTasks).not.toHaveBeenCalled();
  });

  it('discards the in-progress photo when leaving the photo tool', () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const clearStickyNoteCardRowOverride = vi.fn();
    cancelLocalImageCreateDraftIfLeftImageTool({
      clearStickyNoteCardRowOverride,
      closeNoteComposer: vi.fn(),
      placementTool: 'task',
      previousTool: 'image',
      setTaskPositions,
      setTasks,
      tasks: [draftPhoto()],
    });

    const nextTasks = setTasks.mock.calls[0][0]([
      draftPhoto(),
      { id: 'DEV-1' } as Task,
    ]) as Task[];
    expect(nextTasks.map((task) => task.id)).toEqual(['DEV-1']);
    expect(clearStickyNoteCardRowOverride).toHaveBeenCalledWith('local-task-photo');
  });
});

function draftDiagram(): Task {
  return {
    id: 'local-task-diagram',
    isLocalTask: true,
    localDraftKind: 'diagram',
    link: '#',
    name: '',
    status: 'todo',
    team: 'Back',
  };
}

describe('findLocalDiagramCreateDraftId', () => {
  it('finds a local diagram draft', () => {
    expect(findLocalDiagramCreateDraftId([draftDiagram()])).toBe('local-task-diagram');
  });
});

describe('cancelLocalDiagramCreateDraftIfLeftDiagramTool', () => {
  it('discards the in-progress diagram when leaving the diagram tool', () => {
    const setTasks = vi.fn();
    cancelLocalDiagramCreateDraftIfLeftDiagramTool({
      closeNoteComposer: vi.fn(),
      placementTool: 'task',
      previousTool: 'diagram',
      setTaskPositions: vi.fn(),
      setTasks,
      tasks: [draftDiagram()],
    });
    const nextTasks = setTasks.mock.calls[0][0]([
      draftDiagram(),
      { id: 'DEV-1' } as Task,
    ]) as Task[];
    expect(nextTasks.map((task) => task.id)).toEqual(['DEV-1']);
  });
});
