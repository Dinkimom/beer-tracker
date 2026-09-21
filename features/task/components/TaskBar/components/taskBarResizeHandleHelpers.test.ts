import { describe, expect, it } from 'vitest';

import {
  getDragSourceGhostRadiusClass,
  getQuickAddSubmittingOverlayRadiusClass,
  getResizeHandleInlineGripOpacityClass,
  getResizeHandleRoundedClass,
  getResizeHandleVerticalEdgeClass,
  getResizeHandleVerticalGripLineSizeClass,
  getResizeHandleVerticalGripOffsetClass,
  getResizeHandleVerticalHeightClass,
  getResizeHandleVisualVisibilityClass,
  isTaskBarResizeHandleActive,
  RESIZE_HANDLE_VISUAL_TRANSITION_CLASS,
  resolveResizeHandleCornerStyle,
  resolvePhotoCardResizeHandleInlinePaint,
  resolveStickyNoteResizeHandleInlinePaint,
  resolveTaskBarResizeHandleColors,
  resolveTaskBarResizeHandleInlinePaint,
} from './taskBarResizeHandleHelpers';

describe('resolveTaskBarResizeHandleColors', () => {
  it('exposes static /20 hover backdrop classes for Tailwind JIT', () => {
    const { hoverBgClass, hoverBgClassDark, resizeHandleColors } = resolveTaskBarResizeHandleColors({
      isDraftTask: false,
      isQATask: false,
      originalStatus: 'inProgress',
      phaseCardColorScheme: 'status',
    });
    expect(hoverBgClass).toBe('bg-blue-200/20');
    expect(hoverBgClassDark).toBe('dark:bg-blue-700/20');
    expect(resizeHandleColors.bg).toBe('bg-blue-200/60');
    expect(resizeHandleColors.hoverBg).toBe(hoverBgClass);
  });

  it('uses statusColorKey override like the task card (blocked → blue from settings)', () => {
    const withoutOverride = resolveTaskBarResizeHandleColors({
      isDraftTask: false,
      isQATask: false,
      originalStatus: 'blocked',
      phaseCardColorScheme: 'status',
    });
    expect(withoutOverride.resizeHandleColors.bg).toBe('bg-red-200/60');

    const withOverride = resolveTaskBarResizeHandleColors({
      isDraftTask: false,
      isQATask: false,
      originalStatus: 'blocked',
      phaseCardColorScheme: 'status',
      statusColorKey: 'inProgress',
    });
    expect(withOverride.resizeHandleColors.bg).toBe('bg-blue-200/60');
    expect(withOverride.hoverBgClass).toBe('bg-blue-200/20');
  });
});

describe('getResizeHandleVisualVisibilityClass', () => {
  it('forces visible while resizing', () => {
    expect(getResizeHandleVisualVisibilityClass(true)).toBe(
      'opacity-100 task-bar-resize-handle-visual--active'
    );
  });

  it('hides by default and reveals on named group hover', () => {
    expect(getResizeHandleVisualVisibilityClass(false)).toBe(
      'opacity-0 group-hover/resize-handle:opacity-100'
    );
  });
});

describe('RESIZE_HANDLE_VISUAL_TRANSITION_CLASS', () => {
  it('uses globals.css exception class (Tailwind transitions are overridden)', () => {
    expect(RESIZE_HANDLE_VISUAL_TRANSITION_CLASS).toBe('task-bar-resize-handle-visual');
  });
});

describe('isTaskBarResizeHandleActive', () => {
  it('is active only for the resizing side', () => {
    expect(isTaskBarResizeHandleActive(true, 'left', 'left')).toBe(true);
    expect(isTaskBarResizeHandleActive(true, 'left', 'right')).toBe(false);
    expect(isTaskBarResizeHandleActive(false, 'left', 'left')).toBe(false);
  });
});

describe('getResizeHandleRoundedClass', () => {
  it('matches task-card corners by default', () => {
    expect(getResizeHandleRoundedClass('left')).toBe('rounded-l-lg');
    expect(getResizeHandleRoundedClass('right')).toBe('rounded-r-lg');
  });

  it('keeps sticky-note handles square', () => {
    expect(getResizeHandleRoundedClass('left', 'square')).toBe('rounded-none');
    expect(getResizeHandleRoundedClass('right', 'square')).toBe('rounded-none');
  });

  it('matches the square photo-card frame', () => {
    expect(getResizeHandleRoundedClass('left', 'photo')).toBe('rounded-none');
    expect(getResizeHandleRoundedClass('right', 'photo')).toBe('rounded-none');
  });

  it('keeps full-width swimlane row handles square', () => {
    expect(getResizeHandleRoundedClass('right', 'flat')).toBe('rounded-none');
  });
});

describe('resolveResizeHandleCornerStyle', () => {
  it('prefers photo radius over the default task rounding', () => {
    expect(resolveResizeHandleCornerStyle(true, false)).toBe('photo');
    expect(resolveResizeHandleCornerStyle(false, true)).toBe('square');
    expect(resolveResizeHandleCornerStyle(false, false)).toBe('rounded');
  });
});

describe('getDragSourceGhostRadiusClass', () => {
  it('matches the card radius for photo and sticky placeholders', () => {
    expect(getDragSourceGhostRadiusClass('photo')).toBe('rounded-none');
    expect(getDragSourceGhostRadiusClass('square')).toBe('rounded-none');
    expect(getDragSourceGhostRadiusClass('rounded')).toBe('rounded-xl');
  });
});

describe('getQuickAddSubmittingOverlayRadiusClass', () => {
  it('matches the square photo-card and sticky-note frame', () => {
    expect(getQuickAddSubmittingOverlayRadiusClass('photo')).toBe('rounded-none');
    expect(getQuickAddSubmittingOverlayRadiusClass('square')).toBe('rounded-none');
  });

  it('matches task-card corners by default', () => {
    expect(getQuickAddSubmittingOverlayRadiusClass()).toBe('rounded-lg');
    expect(getQuickAddSubmittingOverlayRadiusClass('rounded')).toBe('rounded-lg');
  });
});

describe('resolveStickyNoteResizeHandleInlinePaint', () => {
  it('uses a stronger overlay while resizing', () => {
    const idle = resolveStickyNoteResizeHandleInlinePaint('green', false, false);
    const active = resolveStickyNoteResizeHandleInlinePaint('green', false, true);
    expect(active.background).not.toBe(idle.background);
    expect(active.line).toBe(idle.line);
  });
});

describe('resolveTaskBarResizeHandleInlinePaint', () => {
  it('returns photo paint for photo cards', () => {
    const paint = resolveTaskBarResizeHandleInlinePaint('photo', false, false);
    expect(paint?.background).toContain('rgba(20, 24, 28');
  });

  it('returns sticky paint for square cards', () => {
    const paint = resolveTaskBarResizeHandleInlinePaint('square', false, false, 'green');
    expect(paint?.background).toBe(resolveStickyNoteResizeHandleInlinePaint('green', false, false).background);
  });
});

describe('resolvePhotoCardResizeHandleInlinePaint', () => {
  it('uses a stronger overlay while resizing', () => {
    const idle = resolvePhotoCardResizeHandleInlinePaint(false, false);
    const active = resolvePhotoCardResizeHandleInlinePaint(false, true);
    expect(active.background).not.toBe(idle.background);
    expect(active.line).toBe(idle.line);
  });
});

describe('getResizeHandleVerticalEdgeClass', () => {
  it('keeps the handle on the card edge', () => {
    expect(getResizeHandleVerticalEdgeClass('bottom')).toBe('bottom-0');
    expect(getResizeHandleVerticalEdgeClass('top')).toBe('top-0');
  });
});

describe('getResizeHandleVerticalHeightClass', () => {
  it('matches the compact sticky-note grip on photo cards', () => {
    expect(getResizeHandleVerticalHeightClass('square')).toBe('h-4');
    expect(getResizeHandleVerticalHeightClass('photo')).toBe('h-4');
    expect(getResizeHandleVerticalHeightClass('rounded')).toBe('h-6');
  });
});

describe('photo vertical grip matches the sticky note', () => {
  it('uses the same offset and dash width', () => {
    expect(getResizeHandleVerticalGripOffsetClass('bottom', 'photo')).toBe(
      getResizeHandleVerticalGripOffsetClass('bottom', 'square')
    );
    expect(getResizeHandleVerticalGripLineSizeClass('photo')).toBe(
      getResizeHandleVerticalGripLineSizeClass('square')
    );
  });
});

describe('getResizeHandleInlineGripOpacityClass', () => {
  it('keeps grip lines fully visible while resizing', () => {
    expect(getResizeHandleInlineGripOpacityClass(true)).toBe('');
    expect(getResizeHandleInlineGripOpacityClass(false)).toBe(
      'opacity-40 group-hover/resize-handle:opacity-100'
    );
  });
});
