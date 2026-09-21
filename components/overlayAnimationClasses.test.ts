import { describe, expect, it } from 'vitest';

import {
  OVERLAY_BACKDROP_ENTER,
  OVERLAY_CENTERED_DIALOG_ANIMATION,
  OVERLAY_FLOATING_ANIMATION,
  OVERLAY_PANEL_ENTER,
  OVERLAY_TOOLTIP_ANIMATION,
} from './overlayAnimationClasses';

describe('overlayAnimationClasses', () => {
  it('uses CSS classes driven by data-state', () => {
    expect(OVERLAY_FLOATING_ANIMATION).toBe('overlay-float');
    expect(OVERLAY_PANEL_ENTER).toBe('overlay-panel');
    expect(OVERLAY_BACKDROP_ENTER).toBe('overlay-backdrop');
    expect(OVERLAY_CENTERED_DIALOG_ANIMATION).toBe('overlay-dialog');
    expect(OVERLAY_TOOLTIP_ANIMATION).toBe('overlay-tooltip');
  });
});
