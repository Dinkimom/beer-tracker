import { describe, expect, it } from 'vitest';

import { isQuickAddChooserDraft, resolveQuickAddGhostPlaceholderKey, resolveTaskCardTitlePlaceholderClass } from './taskCardContentHelpers';

describe('resolveTaskCardTitlePlaceholderClass', () => {
  it('keeps the bold task title font, not the sticky-note handwriting', () => {
    const className = resolveTaskCardTitlePlaceholderClass(false);
    expect(className).toContain('font-bold');
    expect(className).not.toContain('font-excalifont');
    expect(className).not.toContain('font-normal');
  });

  it('keeps the sticky-note handwriting on comment drafts', () => {
    const className = resolveTaskCardTitlePlaceholderClass(true);
    expect(className).toContain('font-excalifont');
    expect(className).toContain('font-normal');
  });
});

describe('resolveQuickAddGhostPlaceholderKey', () => {
  it('uses a link prompt for existing-issue drafts', () => {
    expect(resolveQuickAddGhostPlaceholderKey('existing')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.existingGhostPlaceholder'
    );
    expect(resolveQuickAddGhostPlaceholderKey('task')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.titlePlaceholder'
    );
    expect(resolveQuickAddGhostPlaceholderKey('comment')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.commentGhostPlaceholder'
    );
  });
});

describe('isQuickAddChooserDraft', () => {
  it('is true only for a local draft before a kind is picked', () => {
    expect(isQuickAddChooserDraft({ isLocalTask: true })).toBe(true);
    expect(isQuickAddChooserDraft({ isLocalTask: true, localDraftKind: 'task' })).toBe(false);
    expect(isQuickAddChooserDraft({ isLocalTask: false })).toBe(false);
  });
});
