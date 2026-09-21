import { describe, expect, it } from 'vitest';

import {
  quickAddDraftKindToMode,
  quickAddModeToDraftKind,
  resolveQuickAddGhostText,
  splitQuickAddDraftFields,
} from './quickAddMenuDraftState';

describe('splitQuickAddDraftFields', () => {
  it('puts the incoming title on a new task by default', () => {
    expect(splitQuickAddDraftFields({ title: 'Fix login' })).toEqual({
      caption: '',
      comment: '',
      diagramName: '',
      title: 'Fix login',
    });
  });

  it('keeps comment text out of the task title when editing a note', () => {
    expect(splitQuickAddDraftFields({ lockedMode: 'comment', title: 'Ship it' })).toEqual({
      caption: '',
      comment: 'Ship it',
      diagramName: '',
      title: '',
    });
  });

  it('restores comment text from the draft kind after remount', () => {
    expect(splitQuickAddDraftFields({ draftKind: 'comment', title: 'Ship it' })).toEqual({
      caption: '',
      comment: 'Ship it',
      diagramName: '',
      title: '',
    });
  });

  it('keeps an image caption out of the task title', () => {
    expect(
      splitQuickAddDraftFields({ imageUrl: 'blob:1', lockedMode: 'image', title: 'Screenshot' })
    ).toEqual({
      caption: 'Screenshot',
      comment: '',
      diagramName: '',
      title: '',
    });
  });

  it('keeps a diagram name out of the task title', () => {
    expect(
      splitQuickAddDraftFields({ draftKind: 'diagram', title: 'Architecture' })
    ).toEqual({
      caption: '',
      comment: '',
      diagramName: 'Architecture',
      title: '',
    });
  });
});

describe('quickAddModeToDraftKind', () => {
  it('maps existing search to its own ghost kind', () => {
    expect(quickAddModeToDraftKind('existing')).toBe('existing');
    expect(quickAddModeToDraftKind('new')).toBe('task');
    expect(quickAddModeToDraftKind('comment')).toBe('comment');
    expect(quickAddModeToDraftKind('diagram')).toBe('diagram');
    expect(quickAddModeToDraftKind('image')).toBe('image');
  });
});

describe('quickAddDraftKindToMode', () => {
  it('restores the comment tab from a comment draft', () => {
    expect(quickAddDraftKindToMode('comment')).toBe('comment');
    expect(quickAddDraftKindToMode('diagram')).toBe('diagram');
    expect(quickAddDraftKindToMode('image')).toBe('image');
    expect(quickAddDraftKindToMode('existing')).toBe('existing');
    expect(quickAddDraftKindToMode('task')).toBe('new');
    expect(quickAddDraftKindToMode(undefined, 'blob:1')).toBe('image');
    expect(quickAddDraftKindToMode(undefined)).toBe('new');
  });
});

describe('resolveQuickAddGhostText', () => {
  const fields = { caption: 'Cap', comment: 'Note', diagramName: 'Schema', title: 'Task' };

  it('does not leak text across modes', () => {
    expect(resolveQuickAddGhostText('new', fields)).toBe('Task');
    expect(resolveQuickAddGhostText('comment', fields)).toBe('Note');
    expect(resolveQuickAddGhostText('diagram', fields)).toBe('Schema');
    expect(resolveQuickAddGhostText('image', fields)).toBe('Cap');
    expect(resolveQuickAddGhostText('existing', fields)).toBe('');
    expect(resolveQuickAddGhostText('availability', fields)).toBe('');
    expect(resolveQuickAddGhostText('pasteNote', fields)).toBe('');
  });
});
