import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { describe, expect, it } from 'vitest';

import { resolvePlanPatchTaskBarChrome } from './PlanPatchPreviewCaption';

const movePreview: PlanPatchPositionPreview = {
  assigneeId: 'lane',
  changes: ['schedule'],
  duration: 2,
  remove: false,
  startDay: 4,
  startPart: 0,
  taskId: 'RND-1914',
};

describe('resolvePlanPatchTaskBarChrome', () => {
  it('dims a removal with the pending-approval opacity and keeps the toolbar on that card', () => {
    const preview = { ...movePreview, changes: [], remove: true };
    const chrome = resolvePlanPatchTaskBarChrome({
      focusTaskId: null,
      preview,
      taskId: preview.taskId,
    });
    expect(chrome.opacityFactor).toBe(0.65);
    expect(chrome.toolbarPreview).toBe(preview);
    expect(chrome.ringClass).toBe('');
  });

  it('keeps a move ghost at full chrome opacity and puts the toolbar on the ghost', () => {
    const chrome = resolvePlanPatchTaskBarChrome({
      focusTaskId: movePreview.taskId,
      planPatchGhost: true,
      preview: movePreview,
      taskId: movePreview.taskId,
    });
    expect(chrome.opacityFactor).toBe(1);
    expect(chrome.toolbarPreview).toBe(movePreview);
    expect(chrome.ringClass).toContain('transition-shadow');
    expect(chrome.ringClass).toContain('rgb(14_165_233/0.8)');
  });

  it('keeps a transparent ring on a move so the outline can fade', () => {
    const chrome = resolvePlanPatchTaskBarChrome({
      focusTaskId: null,
      preview: movePreview,
      taskId: movePreview.taskId,
    });
    expect(chrome.ringClass).toContain('transition-shadow');
    expect(chrome.ringClass).toContain('transparent');
  });

  it('does not ring a card that is only being added', () => {
    const chrome = resolvePlanPatchTaskBarChrome({
      focusTaskId: 'RND-1918',
      planPatchGhost: true,
      preview: { ...movePreview, changes: [], taskId: 'RND-1918' },
      taskId: 'RND-1918',
    });
    expect(chrome.ringClass).toBe('');
  });

  it('rings a note and its replacement draft while the draft is hovered', () => {
    const chrome = resolvePlanPatchTaskBarChrome({
      focusTaskId: null,
      noteFocused: true,
      preview: undefined,
      taskId: 'comment:n-1',
    });
    expect(chrome.ringClass).toBe(' sticky-note-focus-ring');
    expect(
      resolvePlanPatchTaskBarChrome({ focusTaskId: null, preview: undefined, taskId: 'comment:n-1' }).ringClass
    ).toBe('');
  });
});
