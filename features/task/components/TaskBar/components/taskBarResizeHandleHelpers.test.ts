import { describe, expect, it } from 'vitest';

import {
  getDragSourceGhostRadiusClass,
  getQuickAddSubmittingOverlayRadiusClass,
  getResizeHandleInlineGripOpacityClass,
  getResizeHandleRoundedClass,
  getResizeHandleVisualVisibilityClass,
  isTaskBarResizeHandleActive,
  RESIZE_HANDLE_VISUAL_TRANSITION_CLASS,
  resolveResizeHandleCornerStyle,
  resolvePhotoCardResizeHandleInlinePaint,
  resolveStickyNoteResizeHandleInlinePaint,
  resolveTaskBarResizeHandleColors,
  resolveTaskBarResizeHandleInlinePaint,
  resolveTaskBarResizeHandleLayout,
  resolveTaskBarResizeHandleTitle,
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

  it('does not replace a QA review palette with backlog', () => {
    const qaReview = resolveTaskBarResizeHandleColors({
      isDraftTask: false,
      isQATask: true,
      originalStatus: 'readyfordevelopment',
      phaseCardColorScheme: 'status',
      statusColorKey: 'inreview',
    });
    expect(qaReview.resizeHandleColors.bg).toBe('bg-pink-200/60');
    expect(qaReview.hoverBgClass).toBe('bg-pink-200/20');
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
    expect(isTaskBarResizeHandleActive(true, 'bottom', 'bottom')).toBe(true);
    expect(isTaskBarResizeHandleActive(true, 'left', 'bottom')).toBe(false);
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

describe('resolveTaskBarResizeHandleTitle', () => {
  it('uses a key per side', () => {
    const t = (key: string) => key;
    expect(resolveTaskBarResizeHandleTitle('left', t)).toBe('task.taskBar.resizeLeftTitle');
    expect(resolveTaskBarResizeHandleTitle('right', t)).toBe('task.taskBar.resizeRightTitle');
    expect(resolveTaskBarResizeHandleTitle('top', t)).toBe('task.taskBar.resizeTopTitle');
    expect(resolveTaskBarResizeHandleTitle('bottom', t)).toBe('task.taskBar.resizeBottomTitle');
  });
});

describe('resolveTaskBarResizeHandleLayout', () => {
  it('pins side handles to their edge with an overhang outside the card', () => {
    const left = resolveTaskBarResizeHandleLayout('left');
    expect(left.hitClass).toContain('left-0');
    expect(left.hitClass).toContain('cursor-ew-resize');
    expect(left.hitOverhangClass).toBe('-left-2');
    expect(left.backgroundClass).toContain('rounded-l-lg');
    expect(left).toMatchObject({ nudgeAxis: 'x', nudgeDirection: -1 });
    expect(resolveTaskBarResizeHandleLayout('right')).toMatchObject({
      hitOverhangClass: '-right-2',
      nudgeAxis: 'x',
      nudgeDirection: 1,
    });
  });

  it('keeps the bottom handle on the card edge without an overhang', () => {
    const bottom = resolveTaskBarResizeHandleLayout('bottom');
    expect(bottom.hitClass).toContain('bottom-0');
    expect(bottom.hitClass).toContain('cursor-ns-resize');
    expect(bottom.hitOverhangClass).toBeNull();
    expect(bottom).toMatchObject({ nudgeAxis: 'y', nudgeDirection: 1 });
    expect(resolveTaskBarResizeHandleLayout('top').hitClass).toContain('top-0');
  });

  it('uses the compact vertical grip on sticky notes and photo cards', () => {
    expect(resolveTaskBarResizeHandleLayout('bottom', 'square').hitClass).toContain('h-4');
    expect(resolveTaskBarResizeHandleLayout('bottom', 'rounded').hitClass).toContain('h-6');
    expect(resolveTaskBarResizeHandleLayout('bottom', 'photo')).toEqual(
      resolveTaskBarResizeHandleLayout('bottom', 'square')
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
