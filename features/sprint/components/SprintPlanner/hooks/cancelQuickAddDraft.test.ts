import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { cancelLocalCreateDraftOnToolLeave, findLocalCreateDraftId } from './cancelQuickAddDraft';

type InlineDraftKind = 'comment' | 'diagram' | 'image';

function localDraft(kind: InlineDraftKind): Task {
  return {
    id: `local-task-${kind}`,
    isLocalTask: true,
    localDraftKind: kind,
    link: '#',
    name: '',
    status: 'todo',
    team: 'Back',
  };
}

function leaveTool(
  kind: InlineDraftKind,
  overrides: Partial<Parameters<typeof cancelLocalCreateDraftOnToolLeave>[0]> = {}
) {
  const mocks = {
    clearNoteEditPreview: vi.fn(),
    clearStickyNoteCardRowOverride: vi.fn(),
    closeNoteComposer: vi.fn(),
    setTaskPositions: vi.fn(),
    setTasks: vi.fn(),
  };
  cancelLocalCreateDraftOnToolLeave({
    ...mocks,
    placementTool: 'cursor',
    previousTool: kind,
    tasks: [localDraft(kind)],
    ...overrides,
  });
  return mocks;
}

function tasksLeftAfter(setTasks: ReturnType<typeof vi.fn>, kind: InlineDraftKind): string[] {
  const next = setTasks.mock.calls[0][0]([localDraft(kind), { id: 'DEV-1' } as Task]) as Task[];
  return next.map((task) => task.id);
}

describe('findLocalCreateDraftId', () => {
  it('finds the unsaved local draft of the requested kind', () => {
    const tasks: Task[] = [
      { id: 'comment:1', localDraftKind: 'comment', link: '#', name: 'Saved', team: 'Back' },
      localDraft('comment'),
      localDraft('image'),
    ];
    expect(findLocalCreateDraftId(tasks, 'comment')).toBe('local-task-comment');
    expect(findLocalCreateDraftId(tasks, 'image')).toBe('local-task-image');
    expect(findLocalCreateDraftId(tasks, 'diagram')).toBeUndefined();
  });
});

describe('cancelLocalCreateDraftOnToolLeave', () => {
  it.each<InlineDraftKind>(['comment', 'image', 'diagram'])(
    'discards the %s draft when leaving its tool',
    (kind) => {
      const input = leaveTool(kind);
      expect(tasksLeftAfter(input.setTasks, kind)).toEqual(['DEV-1']);
      expect(input.clearStickyNoteCardRowOverride).toHaveBeenCalledWith(`local-task-${kind}`);
    }
  );

  it.each<InlineDraftKind>(['comment', 'image', 'diagram'])(
    'keeps the %s draft while its tool stays selected',
    (kind) => {
      const input = leaveTool(kind, { placementTool: kind });
      expect(input.setTasks).not.toHaveBeenCalled();
    }
  );

  it('ignores tools that do not create inline drafts', () => {
    const input = leaveTool('comment', { previousTool: 'task', placementTool: 'cursor' });
    expect(input.setTasks).not.toHaveBeenCalled();
  });

  it('does not touch a draft of another kind', () => {
    const input = leaveTool('image', { tasks: [localDraft('comment')] });
    expect(input.setTasks).not.toHaveBeenCalled();
  });

  it('clears the note edit preview only for notes', () => {
    expect(leaveTool('comment').clearNoteEditPreview).toHaveBeenCalled();
    expect(leaveTool('image').clearNoteEditPreview).not.toHaveBeenCalled();
  });

  it.each<InlineDraftKind>(['image', 'diagram'])(
    'keeps the %s draft once when keepInlineCardDraftRef is set',
    (kind) => {
      const keepInlineCardDraftRef = { current: true };
      const input = leaveTool(kind, { keepInlineCardDraftRef });
      expect(input.setTasks).not.toHaveBeenCalled();
      expect(keepInlineCardDraftRef.current).toBe(false);
    }
  );

  it('ignores keepInlineCardDraftRef for notes', () => {
    const keepInlineCardDraftRef = { current: true };
    const input = leaveTool('comment', { keepInlineCardDraftRef });
    expect(tasksLeftAfter(input.setTasks, 'comment')).toEqual(['DEV-1']);
    expect(keepInlineCardDraftRef.current).toBe(true);
  });
});
