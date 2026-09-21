import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  buildTaskLayerPlanSegmentQuickAddMenu,
  resolveQuickAddPersonAssigneeId,
} from './taskLayerPlanSegmentQuickAddMenu';

function draftTask(overrides?: Partial<Task>): Task {
  return {
    id: 'local-task-1',
    isLocalTask: true,
    localDraftKind: 'task',
    link: '#',
    name: '',
    status: 'todo',
    team: 'Back',
    trackerQueue: 'QUEUE',
    type: 'task',
    ...overrides,
  };
}

function buildMenu(
  overrides?: Partial<Parameters<typeof buildTaskLayerPlanSegmentQuickAddMenu>[0]>
) {
  return buildTaskLayerPlanSegmentQuickAddMenu({
    draftIssueType: 'task',
    draftParentKey: '',
    draftQueueKey: 'QUEUE',
    isQuickAddSubmitting: false,
    planSegmentsLength: 1,
    quickAddBoardId: 1,
    quickAddExcludedIssueKeys: new Set(),
    quickAddParentSelectOptions: [],
    quickAddQueueOptions: [{ key: 'QUEUE', name: 'Queue' }],
    segIdx: 0,
    segmentEditorActive: false,
    task: draftTask(),
    ...overrides,
  });
}

describe('buildTaskLayerPlanSegmentQuickAddMenu', () => {
  it('forwards popup title changes onto the draft task card', () => {
    const onQuickAddDraftTitleChange = vi.fn();
    const menu = buildMenu({ onQuickAddDraftTitleChange });

    expect(menu).toBeDefined();
    menu?.onTitleChange('Typed from popup');

    expect(onQuickAddDraftTitleChange).toHaveBeenCalledWith(
      'local-task-1',
      'Typed from popup'
    );
  });

  it('forwards sticky-note color changes onto the draft task card', () => {
    const onQuickAddDraftCommentColorChange = vi.fn();
    const menu = buildMenu({ onQuickAddDraftCommentColorChange });

    expect(menu).toBeDefined();
    menu?.onCommentColorChange('pink');

    expect(onQuickAddDraftCommentColorChange).toHaveBeenCalledWith('local-task-1', 'pink');
  });

  it('does not open a popup when a saved note is edited inline', () => {
    const menu = buildMenu({
      noteComposer: { mode: 'comment', taskId: 'comment:note-1' },
      task: draftTask({
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
        stickyNoteColor: 'pink',
      }),
    });

    expect(menu).toBeUndefined();
  });

  it('opens a locked new-task popup when converting a note', () => {
    const menu = buildMenu({
      draftQueueKey: 'TEAM',
      noteComposer: { mode: 'new', taskId: 'comment:note-1' },
      quickAddQueueOptions: [
        { key: 'AAA', name: 'Aaa' },
        { key: 'TEAM', name: 'Team' },
      ],
      task: draftTask({
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
        trackerQueue: undefined,
      }),
    });

    expect(menu?.lockedMode).toBe('new');
    expect(menu?.queueKey).toBe('TEAM');
    expect(menu?.showAssigneeSelect).toBe(false);
  });

  it('asks for an assignee when converting a team-lane note', () => {
    const menu = buildMenu({
      developers: [
        { id: 'dev-1', name: 'Ada', role: 'developer' },
        { id: 'dev-2', name: 'Bob', role: 'developer' },
      ],
      draftQueueKey: 'QUEUE',
      noteComposer: { mode: 'new', taskId: 'comment:note-1' },
      task: draftTask({
        assignee: '__team__',
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Release Thursday',
      }),
    });

    expect(menu?.lockedMode).toBe('new');
    expect(menu?.requiresAssignee).toBe(true);
    expect(menu?.showAssigneeSelect).toBe(true);
    expect(menu?.assigneeId).toBeUndefined();
  });

  it('does not open a popup for a feature-lane note draft', () => {
    const menu = buildMenu({
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      laneAssigneeId: 'feature-draft:1',
      task: draftTask({
        assignee: 'feature-draft:1',
        localDraftKind: 'comment',
      }),
    });

    expect(menu).toBeUndefined();
  });

  it('still asks for an assignee when creating a tracker task on a feature row', () => {
    const menu = buildMenu({
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      laneAssigneeId: 'parent-1',
      task: draftTask({
        assignee: 'parent-1',
        localDraftKind: undefined,
      }),
    });

    expect(menu?.requiresAssignee).toBe(true);
    expect(menu?.showAssigneeSelect).toBe(true);
    expect(menu?.assigneeId).toBeUndefined();
  });

  it('offers an optional assignee on a team-lane task draft', () => {
    const menu = buildMenu({
      developers: [
        { id: 'dev-1', name: 'Ada', role: 'developer' },
        { id: '__team__', name: 'Shared', role: 'other' },
      ],
      task: draftTask({
        assignee: '__team__',
        localDraftKind: undefined,
      }),
    });

    expect(menu?.requiresAssignee).toBe(false);
    expect(menu?.showAssigneeSelect).toBe(true);
    expect(menu?.assigneeId).toBeUndefined();
  });

  it('prefills the person already assigned on a note being converted', () => {
    const menu = buildMenu({
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      laneAssigneeId: 'parent-1',
      noteComposer: { mode: 'new', taskId: 'comment:note-1' },
      task: draftTask({
        assignee: 'dev-1',
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
      }),
    });

    expect(menu?.lockedMode).toBe('new');
    expect(menu?.assigneeId).toBe('dev-1');
    expect(menu?.showAssigneeSelect).toBe(true);
    expect(menu?.requiresAssignee).toBe(true);
  });

  it('keeps a feature draft row as the parent so it can be linked from the popup', () => {
    const menu = buildMenu({
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      draftParentKey: 'feature-draft:44e9e9a0-1',
      laneAssigneeId: 'feature-draft:44e9e9a0-1',
      noteComposer: { mode: 'new', taskId: 'comment:note-1' },
      task: draftTask({
        assignee: 'feature-draft:44e9e9a0-1',
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Регресс',
      }),
    });

    expect(menu?.parentKey).toBe('feature-draft:44e9e9a0-1');
  });

  it('labels the current feature draft parent by name in the selector', () => {
    const menu = buildMenu({
      draftParentKey: 'feature-draft:1',
      task: draftTask({
        parent: { display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' },
      }),
    });

    expect(menu?.parentSelectOptions).toEqual(
      expect.arrayContaining([{ label: 'Пупи', value: 'feature-draft:1' }])
    );
  });

  it('looks up the draft row title when the stored parent display is the raw id', () => {
    const menu = buildMenu({
      developers: [{ id: 'feature-draft:1', name: 'Пупи', role: 'other' }],
      draftParentKey: 'feature-draft:1',
      task: draftTask({
        parent: {
          display: 'feature-draft:1',
          id: 'feature-draft:1',
          key: 'feature-draft:1',
        },
      }),
    });

    expect(menu?.parentSelectOptions).toEqual(
      expect.arrayContaining([{ label: 'Пупи', value: 'feature-draft:1' }])
    );
  });

  it('does not open a popup for a saved note without a composer', () => {
    const menu = buildMenu({
      task: draftTask({
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
      }),
    });

    expect(menu).toBeUndefined();
  });

  it('does not open a popup when editing a note without a queue', () => {
    const menu = buildMenu({
      draftQueueKey: '',
      noteComposer: { mode: 'comment', taskId: 'comment:note-1' },
      quickAddQueueOptions: [],
      task: draftTask({
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
        trackerQueue: undefined,
      }),
    });

    expect(menu).toBeUndefined();
  });

  it('does not put time off in the cell kind picker', () => {
    const menu = buildMenu({
      availabilityStartDate: '2026-08-31',
    });

    expect(menu?.onCreateAvailability).toBeUndefined();
  });

  it('pastes the clipboard note onto the draft cell from the kind picker', () => {
    const onPasteQuickAddNote = vi.fn();
    const menu = buildMenu({ onPasteQuickAddNote });

    expect(menu?.onPasteNote).toBeDefined();
    menu?.onPasteNote?.();

    expect(onPasteQuickAddNote).toHaveBeenCalledWith('local-task-1');
  });

  it('does not open a popup for an inline note create draft', () => {
    const menu = buildMenu({
      task: draftTask({ localDraftKind: 'comment', stickyNoteColor: 'green' }),
    });

    expect(menu).toBeUndefined();
  });

  it('does not open a popup for an inline photo create draft', () => {
    expect(
      buildMenu({
        task: draftTask({ localDraftKind: 'image' }),
      })
    ).toBeUndefined();
  });

  it('does not open a popup for a feature-lane photo draft', () => {
    expect(
      buildMenu({
        developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
        laneAssigneeId: 'parent-1',
        task: draftTask({ assignee: 'parent-1', localDraftKind: 'image' }),
      })
    ).toBeUndefined();
  });

  it('does not open a popup for an inline diagram create draft', () => {
    expect(
      buildMenu({
        task: draftTask({ localDraftKind: 'diagram' }),
      })
    ).toBeUndefined();
  });

  it('does not open a popup for a feature-lane diagram draft', () => {
    expect(
      buildMenu({
        developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
        laneAssigneeId: 'feature-draft:1',
        task: draftTask({ assignee: 'feature-draft:1', localDraftKind: 'diagram' }),
      })
    ).toBeUndefined();
  });

  it('does not open a popup when submitting an inline note edit', () => {
    const menu = buildMenu({
      noteComposer: { mode: 'comment', taskId: 'comment:note-1' },
      task: draftTask({
        id: 'comment:note-1',
        isLocalTask: undefined,
        localDraftKind: 'comment',
        name: 'Sticky text',
        stickyNoteColor: 'green',
      }),
    });

    expect(menu).toBeUndefined();
  });
});

describe('resolveQuickAddPersonAssigneeId', () => {
  const people = [{ id: 'dev-1' }, { id: 'dev-2' }];

  it('returns a board person already assigned on the note', () => {
    expect(resolveQuickAddPersonAssigneeId('dev-1', people)).toBe('dev-1');
  });

  it('ignores team, no-parent and feature-draft row ids', () => {
    expect(resolveQuickAddPersonAssigneeId('__team__', people)).toBeUndefined();
    expect(resolveQuickAddPersonAssigneeId('__task_group_no_parent__', people)).toBeUndefined();
    expect(resolveQuickAddPersonAssigneeId('feature-draft:1', people)).toBeUndefined();
  });

  it('ignores a feature row id that is not a person on the board', () => {
    expect(resolveQuickAddPersonAssigneeId('parent-1', people)).toBeUndefined();
  });
});
