import { describe, expect, it } from 'vitest';

import {
  buildQuickAddRootPickerItems,
  filterQuickAddVisibleModes,
  quickAddModeIconName,
  quickAddModeMessageKey,
  resolveQuickAddModeChange,
  shouldOpenQuickAddKindPicker,
  shouldShowQuickAddBootstrapLoader,
} from './quickAddMenuModes';

describe('filterQuickAddVisibleModes', () => {
  it('hides notes, diagrams and photos when those layers are off', () => {
    expect(
      filterQuickAddVisibleModes({ commentModeEnabled: false, imageModeEnabled: false })
    ).toEqual(['new', 'existing']);
  });

  it('keeps the person-lane chooser short when the capsule owns annotations', () => {
    expect(
      filterQuickAddVisibleModes({ commentModeEnabled: true, imageModeEnabled: true })
    ).toEqual(['new', 'existing']);
  });

  it('puts paste first when a note is on the clipboard and notes are visible', () => {
    expect(
      filterQuickAddVisibleModes({
        commentModeEnabled: true,
        imageModeEnabled: false,
        pasteNoteEnabled: true,
      })
    ).toEqual(['pasteNote', 'new', 'existing']);
  });

  it('hides paste when the notes layer is off', () => {
    expect(
      filterQuickAddVisibleModes({
        commentModeEnabled: false,
        imageModeEnabled: true,
        pasteNoteEnabled: true,
      })
    ).toEqual(['new', 'existing']);
  });

  it('adds absence on a person lane when the handler is wired', () => {
    expect(
      filterQuickAddVisibleModes({
        availabilityModeEnabled: true,
        commentModeEnabled: true,
        imageModeEnabled: true,
      })
    ).toEqual(['new', 'existing', 'availability']);
  });

  it('shows flat annotation modes on the shared team lane', () => {
    expect(
      filterQuickAddVisibleModes({
        commentModeEnabled: true,
        imageModeEnabled: true,
        taskModesEnabled: false,
      })
    ).toEqual(['comment', 'image', 'diagram']);
  });
});

describe('quickAddModeMessageKey', () => {
  it('maps each mode to its i18n key', () => {
    expect(quickAddModeMessageKey('new')).toBe('sprintPlanner.swimlane.quickAddMenu.modeNew');
    expect(quickAddModeMessageKey('existing')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.modeExisting'
    );
    expect(quickAddModeMessageKey('availability')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.modeAvailability'
    );
    expect(quickAddModeMessageKey('comment')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.modeComment'
    );
    expect(quickAddModeMessageKey('image')).toBe('sprintPlanner.swimlane.quickAddMenu.modeImage');
    expect(quickAddModeMessageKey('diagram')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.modeDiagram'
    );
    expect(quickAddModeMessageKey('pasteNote')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.modePasteNote'
    );
  });
});

describe('quickAddModeIconName', () => {
  it('picks a distinct icon for each add type', () => {
    expect(quickAddModeIconName('new')).toBe('issue-task');
    expect(quickAddModeIconName('existing')).toBe('search');
    expect(quickAddModeIconName('availability')).toBe('calendar');
    expect(quickAddModeIconName('comment')).toBe('sticky-note');
    expect(quickAddModeIconName('image')).toBe('image');
    expect(quickAddModeIconName('diagram')).toBe('diagram');
    expect(quickAddModeIconName('pasteNote')).toBe('copy');
  });
});

describe('shouldOpenQuickAddKindPicker', () => {
  it('opens the picker for a fresh cell draft', () => {
    expect(shouldOpenQuickAddKindPicker({})).toBe(true);
  });

  it('skips the picker when a kind is already chosen', () => {
    expect(shouldOpenQuickAddKindPicker({ draftKind: 'task' })).toBe(false);
    expect(shouldOpenQuickAddKindPicker({ draftKind: 'comment' })).toBe(false);
    expect(shouldOpenQuickAddKindPicker({ lockedMode: 'new' })).toBe(false);
    expect(shouldOpenQuickAddKindPicker({ imageUrl: 'blob:1' })).toBe(false);
  });
});

describe('shouldShowQuickAddBootstrapLoader', () => {
  it('waits for tracker fields only on the new/existing form', () => {
    expect(shouldShowQuickAddBootstrapLoader(true, 'new', 'form')).toBe(true);
    expect(shouldShowQuickAddBootstrapLoader(true, 'existing', 'form')).toBe(true);
    expect(shouldShowQuickAddBootstrapLoader(true, 'availability', 'form')).toBe(false);
    expect(shouldShowQuickAddBootstrapLoader(true, 'comment', 'form')).toBe(false);
    expect(shouldShowQuickAddBootstrapLoader(true, 'new', 'picker')).toBe(false);
    expect(shouldShowQuickAddBootstrapLoader(false, 'new', 'form')).toBe(false);
  });
});

describe('buildQuickAddRootPickerItems', () => {
  it('keeps work and absence on a person lane without a note submenu', () => {
    expect(
      buildQuickAddRootPickerItems(['new', 'existing', 'availability'])
    ).toEqual([
      { kind: 'mode', mode: 'new' },
      { kind: 'mode', mode: 'existing' },
      { kind: 'separator' },
      { kind: 'mode', mode: 'availability' },
    ]);
  });

  it('puts paste first on a person lane when a note is on the clipboard', () => {
    expect(buildQuickAddRootPickerItems(['pasteNote', 'new', 'existing'])).toEqual([
      { kind: 'mode', mode: 'pasteNote' },
      { kind: 'mode', mode: 'new' },
      { kind: 'mode', mode: 'existing' },
    ]);
  });

  it('lists annotation kinds flat on the shared team lane', () => {
    expect(
      buildQuickAddRootPickerItems(['pasteNote', 'comment', 'image', 'diagram'])
    ).toEqual([
      { kind: 'mode', mode: 'pasteNote' },
      { kind: 'separator' },
      { kind: 'mode', mode: 'comment' },
      { kind: 'mode', mode: 'image' },
      { kind: 'mode', mode: 'diagram' },
    ]);
  });
});

describe('resolveQuickAddModeChange', () => {
  const base = {
    canCreateAvailability: true,
    canPasteNote: true,
    imagesVisible: true,
    notesVisible: true,
  };

  it('opens the matching action or ignores a locked draft', () => {
    expect(resolveQuickAddModeChange({ ...base, nextMode: 'new' })).toBe('form');
    expect(resolveQuickAddModeChange({ ...base, nextMode: 'existing' })).toBe('form');
    expect(resolveQuickAddModeChange({ ...base, nextMode: 'availability' })).toBe('availability');
    expect(resolveQuickAddModeChange({ ...base, nextMode: 'pasteNote' })).toBe('paste');
    expect(resolveQuickAddModeChange({ ...base, lockedMode: 'new', nextMode: 'comment' })).toBe(
      'noop'
    );
    expect(resolveQuickAddModeChange({ ...base, notesVisible: false, nextMode: 'diagram' })).toBe(
      'noop'
    );
  });
});
