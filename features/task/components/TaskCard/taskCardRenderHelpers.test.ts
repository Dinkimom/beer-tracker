import { describe, expect, it } from 'vitest';

import {
  buildTaskCardHoverShadowClasses,
  buildTaskCardRootClassName,
  resolveTaskCardContextMenuBorderClasses,
  resolveTaskCardHoverGlowColor,
  TASK_CARD_GLOW_CSS_VAR,
  withTaskCardHoverGlowStyle,
} from './taskCardRenderHelpers';

function rootClass(radiusClass?: string): string {
  return buildTaskCardRootClassName({
    borderClasses: '',
    cardBorderColorClasses: '',
    cardSurfaceClasses: '',
    className: '',
    contextMenuBorderClasses: '',
    contextMenuZClasses: '',
    cursorClass: '',
    dimmedClasses: '',
    hoverShadowClasses: '',
    isResizing: false,
    paddingClasses: '',
    radiusClass,
    ringClasses: '',
    sidebarOpacityClasses: '',
    sizeVariantClasses: '',
  });
}

describe('buildTaskCardRootClassName', () => {
  it('uses rounded-lg for regular task cards', () => {
    expect(rootClass()).toContain('rounded-lg');
    expect(rootClass()).toContain('task-card-context-menu-frame');
    expect(rootClass()).not.toContain('rounded-none');
  });

  it('uses square corners for sticky notes instead of task-card rounding', () => {
    expect(rootClass('rounded-none')).toContain('rounded-none');
    expect(rootClass('rounded-none')).not.toContain('rounded-lg');
  });
});

describe('buildTaskCardHoverShadowClasses', () => {
  it('skips hover shadow while linking', () => {
    expect(buildTaskCardHoverShadowClasses(false, false, false, true)).toBe('');
    expect(buildTaskCardHoverShadowClasses(false, false, false, false)).toBe(
      'task-card-swimlane-hover-shadow'
    );
  });

  it('skips hover shadow for local draft tasks but keeps it for sticky notes', () => {
    expect(buildTaskCardHoverShadowClasses(true, false, false, false)).toBe('');
    expect(buildTaskCardHoverShadowClasses(true, false, false, false, true)).toBe(
      'task-card-swimlane-hover-shadow'
    );
  });
});

describe('resolveTaskCardHoverGlowColor', () => {
  it('is unset in light theme', () => {
    expect(
      resolveTaskCardHoverGlowColor({
        isDark: false,
        isLocalCommentDraft: false,
        isLocalDiagramCard: false,
        isLocalImageCard: false,
        phaseCardColorScheme: 'status',
        task: { originalStatus: 'closed' },
      })
    ).toBeUndefined();
  });

  it('uses status accent hex for task cards in dark theme', () => {
    expect(
      resolveTaskCardHoverGlowColor({
        isDark: true,
        isLocalCommentDraft: false,
        isLocalDiagramCard: false,
        isLocalImageCard: false,
        phaseCardColorScheme: 'status',
        task: { originalStatus: 'closed' },
      })
    ).toBe('#22c55e');
  });

  it('uses sticky note border for comment cards in dark theme', () => {
    expect(
      resolveTaskCardHoverGlowColor({
        isDark: true,
        isLocalCommentDraft: true,
        isLocalDiagramCard: false,
        isLocalImageCard: false,
        phaseCardColorScheme: 'status',
        stickyNoteColor: 'yellow',
        task: {},
      })
    ).toBe('#eab308');
  });
});

describe('withTaskCardHoverGlowStyle', () => {
  it('writes the glow css variable when color is set', () => {
    expect(withTaskCardHoverGlowStyle({ color: 'red' }, '#22c55e')).toEqual({
      color: 'red',
      [TASK_CARD_GLOW_CSS_VAR]: '#22c55e',
    });
  });
});

describe('resolveTaskCardContextMenuBorderClasses', () => {
  it('is empty when the context menu is closed on a bordered card', () => {
    expect(resolveTaskCardContextMenuBorderClasses(false)).toBe('');
  });

  it('keeps a transparent outline on photo cards so the frame can fade', () => {
    expect(resolveTaskCardContextMenuBorderClasses(false, true)).toBe(
      ' outline outline-1 outline-offset-0 outline-transparent'
    );
  });

  it('only recolors the existing border for sticky notes and tasks', () => {
    expect(resolveTaskCardContextMenuBorderClasses(true)).toBe(
      ' !border-blue-500 dark:!border-blue-400'
    );
  });

  it('uses outline on photo cards so adding the frame does not shrink content', () => {
    expect(resolveTaskCardContextMenuBorderClasses(true, true)).toBe(
      ' outline outline-1 outline-offset-0 outline-blue-500 dark:outline-blue-400'
    );
  });
});
