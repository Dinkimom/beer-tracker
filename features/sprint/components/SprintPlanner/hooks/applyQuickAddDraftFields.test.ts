import type { Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  applyQuickAddDraftCommentColor,
  applyQuickAddDraftDurationForKind,
  applyQuickAddDraftImageUrl,
  applyQuickAddDraftKind,
  applyQuickAddDraftParent,
  applyQuickAddDraftTitle,
  applyQuickAddImageDraftCardRow,
  plannerDraftParentFromKey,
  syncQuickAddCommentPresencePreview,
  trackerAssigneeKeyForCreate,
  trackerParentKeyForCreate,
  QUICK_ADD_IMAGE_DRAFT_CARD_ROW,
  QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS,
  resolveQuickAddDraftDurationParts,
} from './applyQuickAddDraftFields';
import { cancelQuickAddDraft } from './cancelQuickAddDraft';

describe('applyQuickAddDraftFields', () => {
  it('updates imageUrl only on the local draft', () => {
    const tasks = [
      { id: 'local-task-1', isLocalTask: true, imageUrl: 'blob:old', name: 'a' },
      { id: 'ISSUE-1', name: 'other' },
    ] as Task[];

    const next = applyQuickAddDraftImageUrl(tasks, 'local-task-1', 'blob:new');

    expect(next[0]?.imageUrl).toBe('blob:new');
    expect(next[1]?.imageUrl).toBeUndefined();
  });

  it('sets a remote parent key when the parent is not in the sprint list', () => {
    const tasks = [{ id: 'local-task-1', isLocalTask: true, name: 'draft' }] as Task[];

    const next = applyQuickAddDraftParent(tasks, 'local-task-1', 'QUEUE-99', []);

    expect(next[0]?.parent).toEqual({
      display: 'QUEUE-99',
      id: 'QUEUE-99',
      key: 'QUEUE-99',
    });
  });

  it('links a local draft to a named feature draft without exposing the raw id', () => {
    const tasks = [{ id: 'local-task-1', isLocalTask: true, name: 'draft' }] as Task[];
    const draftParent = {
      display: 'Пупи',
      id: 'feature-draft:1',
      key: 'feature-draft:1',
    };

    const next = applyQuickAddDraftParent(tasks, 'local-task-1', 'feature-draft:1', [draftParent]);

    expect(next[0]?.parent).toEqual(draftParent);
  });

  it('keeps a feature-draft parent even when it is missing from the sprint list', () => {
    const tasks = [{ id: 'local-task-1', isLocalTask: true, name: 'draft' }] as Task[];

    const next = applyQuickAddDraftParent(tasks, 'local-task-1', 'feature-draft:1', []);

    expect(next[0]?.parent).toEqual({
      display: 'feature-draft:1',
      id: 'feature-draft:1',
      key: 'feature-draft:1',
    });
  });

  it('does not send a feature-draft id to Tracker and keeps it as a planner parent', () => {
    expect(trackerParentKeyForCreate('feature-draft:1')).toBeUndefined();
    expect(trackerParentKeyForCreate('ST-1')).toBe('ST-1');
    expect(trackerAssigneeKeyForCreate('feature-draft:1', 'dev-1')).toBe('dev-1');
    expect(trackerAssigneeKeyForCreate('feature-draft:1')).toBeUndefined();
    expect(
      plannerDraftParentFromKey('feature-draft:1', [
        { display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' },
      ])
    ).toEqual({ display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' });
    expect(plannerDraftParentFromKey('feature-draft:1', [])).toEqual({
      display: 'feature-draft:1',
      id: 'feature-draft:1',
      key: 'feature-draft:1',
    });
    expect(
      plannerDraftParentFromKey('feature-draft:1', [], new Map([['feature-draft:1', 'Пупи']]))
    ).toEqual({ display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' });
  });

  it('uses two timeslots for an image draft and one for task or note', () => {
    expect(resolveQuickAddDraftDurationParts('image', 0, 0, 30)).toBe(
      QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS
    );
    expect(resolveQuickAddDraftDurationParts('diagram', 0, 0, 30)).toBe(
      QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS
    );
    expect(resolveQuickAddDraftDurationParts('task', 0, 0, 30)).toBe(1);
    expect(resolveQuickAddDraftDurationParts('comment', 0, 0, 30)).toBe(1);
    expect(resolveQuickAddDraftDurationParts('existing', 0, 0, 30)).toBe(1);
  });

  it('clamps an image draft that would overflow the timeline', () => {
    expect(resolveQuickAddDraftDurationParts('image', 9, 2, 30)).toBe(1);
  });

  it('sets draft kind only on the local draft', () => {
    const tasks = [
      { id: 'local-task-1', isLocalTask: true, localDraftKind: 'task', name: 'draft' },
      { id: 'ISSUE-1', name: 'other' },
    ] as Task[];

    const next = applyQuickAddDraftKind(tasks, 'local-task-1', 'image');

    expect(next[0]?.localDraftKind).toBe('image');
    expect(next[0]?.storyPoints).toBe(0);
    expect(next[1]?.localDraftKind).toBeUndefined();
  });

  it('assigns one story point only for a new-task draft', () => {
    const tasks = [{ id: 'local-task-1', isLocalTask: true, name: 'draft' }] as Task[];

    const next = applyQuickAddDraftKind(tasks, 'local-task-1', 'task');

    expect(next[0]?.localDraftKind).toBe('task');
    expect(next[0]?.storyPoints).toBe(1);
  });

  it('clears draft kind so the chooser plus can return', () => {
    const tasks = [
      {
        id: 'local-task-1',
        isLocalTask: true,
        localDraftKind: 'diagram',
        name: 'Schema',
        storyPoints: 0,
      },
    ] as Task[];

    const next = applyQuickAddDraftKind(tasks, 'local-task-1', undefined);

    expect(next[0]?.localDraftKind).toBeUndefined();
    expect(next[0]?.storyPoints).toBe(0);
  });

  it('persists sticky-note color only on the local draft', () => {
    const tasks = [
      { id: 'local-task-1', isLocalTask: true, localDraftKind: 'comment', name: 'draft' },
      { id: 'comment:1', localDraftKind: 'comment', name: 'saved', stickyNoteColor: 'yellow' },
    ] as Task[];

    const next = applyQuickAddDraftCommentColor(tasks, 'local-task-1', 'pink');

    expect(next[0]?.stickyNoteColor).toBe('pink');
    expect(next[1]?.stickyNoteColor).toBe('yellow');
  });

  it('expands image draft duration to two parts and restores one when kind is cleared', () => {
    const positions = new Map<string, TaskPosition>([
      [
        'local-task-1',
        {
          assignee: 'dev',
          duration: 1,
          plannedDuration: 1,
          startDay: 0,
          startPart: 0,
          taskId: 'local-task-1',
        },
      ],
    ]);

    const expanded = applyQuickAddDraftDurationForKind(positions, 'local-task-1', 'image', 30);
    expect(expanded.get('local-task-1')?.duration).toBe(2);
    expect(expanded.get('local-task-1')?.plannedDuration).toBe(2);

    const restored = applyQuickAddDraftDurationForKind(expanded, 'local-task-1', undefined, 30);
    expect(restored.get('local-task-1')?.duration).toBe(1);
    expect(restored.get('local-task-1')?.plannedDuration).toBe(1);
  });

  it('pins a photo draft to two card rows and clears the pin for other kinds', () => {
    const ui = {
      clearStickyNoteCardRowOverride: vi.fn(),
      setStickyNoteCardRowOverride: vi.fn(),
    };

    applyQuickAddImageDraftCardRow('local-task-1', 'image', ui);
    expect(ui.setStickyNoteCardRowOverride).toHaveBeenCalledWith(
      'local-task-1',
      QUICK_ADD_IMAGE_DRAFT_CARD_ROW
    );

    applyQuickAddImageDraftCardRow('local-task-1', 'diagram', ui);
    expect(ui.clearStickyNoteCardRowOverride).toHaveBeenCalledWith('local-task-1');
    expect(ui.setStickyNoteCardRowOverride).toHaveBeenCalledTimes(1);

    applyQuickAddImageDraftCardRow('local-task-1', 'comment', ui);
    expect(ui.clearStickyNoteCardRowOverride).toHaveBeenCalledTimes(2);
  });

  it('publishes comment draft title to presence and ignores other kinds', () => {
    const onCommentText = vi.fn();
    const tasks = [
      { id: 'local-task-1', isLocalTask: true, localDraftKind: 'comment', name: '' },
      { id: 'local-task-2', isLocalTask: true, localDraftKind: 'task', name: '' },
    ] as Task[];
    expect(applyQuickAddDraftTitle(tasks, 'local-task-1', 'hello', onCommentText)[0]?.name).toBe(
      'hello'
    );
    expect(onCommentText).toHaveBeenCalledWith('local-task-1', 'hello');
    applyQuickAddDraftTitle(tasks, 'local-task-2', 'issue', onCommentText);
    expect(onCommentText).toHaveBeenCalledTimes(1);
  });

  it('seeds and clears the comment presence preview by draft kind', () => {
    const ui = {
      clearNoteEditPreview: vi.fn(),
      noteEditPreview: { taskId: 'local-task-1' },
      setNoteEditPreview: vi.fn(),
      stickyNoteColor: 'pink' as const,
    };
    syncQuickAddCommentPresencePreview(ui, 'local-task-1', 'comment', 'hello');
    expect(ui.setNoteEditPreview).toHaveBeenCalledWith('local-task-1', {
      color: 'pink',
      text: 'hello',
    });
    syncQuickAddCommentPresencePreview(ui, 'local-task-1', 'task');
    expect(ui.clearNoteEditPreview).toHaveBeenCalledOnce();
  });
});

describe('cancelQuickAddDraft', () => {
  it('removes a local draft and its position', () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const setSubmittingTaskId = vi.fn();
    const tasks = [{ id: 'local-task-1', isLocalTask: true, name: 'draft' }] as Task[];

    cancelQuickAddDraft({
      closeNoteComposer: vi.fn(),
      setSubmittingTaskId,
      setTaskPositions,
      setTasks,
      submittingTaskId: 'local-task-1',
      taskId: 'local-task-1',
      tasks,
    });

    expect(setTasks).toHaveBeenCalledOnce();
    const nextTasks = setTasks.mock.calls[0]?.[0](tasks) as Task[];
    expect(nextTasks).toEqual([]);
    expect(setTaskPositions).toHaveBeenCalledOnce();
    const nextPositions = setTaskPositions.mock.calls[0]?.[0](
      new Map<string, TaskPosition>([
        ['local-task-1', { assignee: 'dev', duration: 1, startDay: 0, startPart: 0, taskId: 'local-task-1' }],
      ])
    ) as Map<string, TaskPosition>;
    expect(nextPositions.has('local-task-1')).toBe(false);
    expect(setSubmittingTaskId).toHaveBeenCalledWith(null);
  });
});
