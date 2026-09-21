import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { CARD_MARGIN, ZIndex } from '@/constants';

import {
  buildSwimlaneOverdueBaselineStripHorizontalStyle,
  buildSwimlaneTaskBarHorizontalStyle,
  buildTaskBarLayoutStyle,
  resolveTaskBarContentLayout,
  resolveTaskBarEffectiveOpacity,
  resolveTaskBarInstantGeometryClass,
  resolveTaskBarLongHoverExpand,
  resolveTaskBarZIndex,
  scaleTaskBarHeightByDuration,
  shouldCancelInlineEditorOnFocusOut,
  shouldCollapseTaskBarLongHoverExpand,
  shouldStartLongHoverExpand,
  TASK_BAR_INSTANT_GEOMETRY_CLASS,
} from './taskBarHelpers';

function resolveHorizontalBarEdgesPx(params: {
  containerWidthPx: number;
  style: { left: string; width: string };
}): { leftPx: number; rightPx: number } {
  const leftMatch = params.style.left.match(/^calc\(([\d.]+)% - (\d+)px\)$/);
  const leftPlusMatch = params.style.left.match(/^calc\(([\d.]+)% \+ (\d+)px\)$/);
  const widthMatch = params.style.width.match(/^calc\(([\d.]+)%(?: - (\d+)px)?\)$/);

  if (!widthMatch) {
    throw new Error(`Unexpected width: ${params.style.width}`);
  }

  const widthPercent = Number.parseFloat(widthMatch[1]!);
  const widthSubtractPx = widthMatch[2] ? Number.parseInt(widthMatch[2], 10) : 0;

  let leftPx: number;
  if (leftMatch) {
    leftPx =
      (Number.parseFloat(leftMatch[1]!) / 100) * params.containerWidthPx -
      Number.parseInt(leftMatch[2]!, 10);
  } else if (leftPlusMatch) {
    leftPx =
      (Number.parseFloat(leftPlusMatch[1]!) / 100) * params.containerWidthPx +
      Number.parseInt(leftPlusMatch[2]!, 10);
  } else {
    throw new Error(`Unexpected left: ${params.style.left}`);
  }

  const widthPx = (widthPercent / 100) * params.containerWidthPx - widthSubtractPx;
  return { leftPx, rightPx: leftPx + widthPx };
}

describe('buildSwimlaneOverdueBaselineStripHorizontalStyle', () => {
  it('starts flush with the task bar right edge', () => {
    const timelineTotalParts = 30;
    const startCell = 10;
    const durationCells = 5;
    const containerWidthPx = 900;
    const endCell = startCell + durationCells;

    const taskBar = buildSwimlaneTaskBarHorizontalStyle({
      durationCells,
      startCell,
      timelineTotalParts,
    });
    const baseline = buildSwimlaneOverdueBaselineStripHorizontalStyle({
      durationCells: 4,
      startCell: endCell,
      timelineTotalParts,
    });

    const taskBarEdges = resolveHorizontalBarEdgesPx({
      containerWidthPx,
      style: taskBar as { left: string; width: string },
    });
    const baselineEdges = resolveHorizontalBarEdgesPx({
      containerWidthPx,
      style: baseline as { left: string; width: string },
    });

    expect(baselineEdges.leftPx).toBeCloseTo(taskBarEdges.rightPx, 5);
    expect(baseline.left).toBe(`calc(${(endCell / timelineTotalParts) * 100}% - ${CARD_MARGIN}px)`);
    expect(baseline.width).toBe('calc(13.333333333333334%)');
  });

  it('ends on the same grid line as a task bar with the same end cell', () => {
    const timelineTotalParts = 30;
    const containerWidthPx = 900;
    const baselineStart = 15;
    const baselineWidth = 6;
    const baselineEnd = baselineStart + baselineWidth;

    const baseline = buildSwimlaneOverdueBaselineStripHorizontalStyle({
      durationCells: baselineWidth,
      startCell: baselineStart,
      timelineTotalParts,
    });
    const referenceBar = buildSwimlaneTaskBarHorizontalStyle({
      durationCells: baselineEnd,
      startCell: 0,
      timelineTotalParts,
    });

    const baselineEdges = resolveHorizontalBarEdgesPx({
      containerWidthPx,
      style: baseline as { left: string; width: string },
    });
    const referenceEdges = resolveHorizontalBarEdgesPx({
      containerWidthPx,
      style: referenceBar as { left: string; width: string },
    });

    expect(baselineEdges.rightPx).toBe(referenceEdges.rightPx);
  });
});

describe('resolveTaskBarContentLayout', () => {
  it('keeps the bar duration and width when the card is not hover-expanded', () => {
    expect(
      resolveTaskBarContentLayout({
        displayWidthPercent: 6.67,
        durationParts: 2,
        expandedMinWidthPercent: 13.33,
        shouldExpandByLongHover: false,
      })
    ).toEqual({
      contentDurationParts: 2,
      contentWidthPercent: 6.67,
    });
  });

  it('uses at least four timeslots for content when the card is hover-expanded', () => {
    expect(
      resolveTaskBarContentLayout({
        displayWidthPercent: 3.33,
        durationParts: 1,
        expandedMinWidthPercent: 13.33,
        shouldExpandByLongHover: true,
      })
    ).toEqual({
      contentDurationParts: 4,
      contentWidthPercent: 13.33,
    });
  });

  it('does not shrink content of a card already wider than four timeslots', () => {
    expect(
      resolveTaskBarContentLayout({
        displayWidthPercent: 16.67,
        durationParts: 5,
        expandedMinWidthPercent: 13.33,
        shouldExpandByLongHover: true,
      })
    ).toEqual({
      contentDurationParts: 5,
      contentWidthPercent: 16.67,
    });
  });
});

describe('resolveTaskBarInstantGeometryClass', () => {
  it('disables width animation while resizing so a left-handle drag does not grow from the right', () => {
    expect(
      resolveTaskBarInstantGeometryClass({ hideSourceForOverlay: false, isResizing: true })
    ).toBe(TASK_BAR_INSTANT_GEOMETRY_CLASS);
  });

  it('disables width animation on the overlay source', () => {
    expect(
      resolveTaskBarInstantGeometryClass({ hideSourceForOverlay: true, isResizing: false })
    ).toBe(TASK_BAR_INSTANT_GEOMETRY_CLASS);
  });

  it('keeps the long-hover width animation when idle', () => {
    expect(
      resolveTaskBarInstantGeometryClass({ hideSourceForOverlay: false, isResizing: false })
    ).toBe('');
  });
});

describe('shouldCollapseTaskBarLongHoverExpand', () => {
  it('keeps the card expanded while its context menu is open even after pointer leave', () => {
    expect(
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis: true,
        isPointerOverCard: false,
      })
    ).toBe(false);
  });

  it('keeps the card expanded after the menu closes if the pointer is still over it', () => {
    expect(
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis: false,
        isPointerOverCard: true,
      })
    ).toBe(false);
  });

  it('collapses when the menu is closed and the pointer is not over the card', () => {
    expect(
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis: false,
        isPointerOverCard: false,
      })
    ).toBe(true);
  });

  it('keeps the card expanded while it is the hovered link source', () => {
    expect(
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis: false,
        isHoveredSource: true,
        isPointerOverCard: false,
      })
    ).toBe(false);
  });

  it('keeps the card expanded while the pointer is over the link delete handle', () => {
    expect(
      shouldCollapseTaskBarLongHoverExpand({
        contextMenuOpenForThis: false,
        isPointerOverCard: false,
        isPointerOverLinkDeleteHandle: true,
      })
    ).toBe(false);
  });
});

describe('resolveTaskBarZIndex', () => {
  const idle = {
    effectiveIsDragging: false,
    isInError: false,
    shouldExpandByLongHover: false,
  };

  it('keeps regular task bars below sticky notes and error cards', () => {
    expect(resolveTaskBarZIndex(idle)).toBe(ZIndex.stickyInContent);
  });

  it('stacks sticky notes above error task bars so overflowing reactions stay visible', () => {
    expect(resolveTaskBarZIndex({ ...idle, isInError: true })).toBe(ZIndex.stickyElevated);
    expect(resolveTaskBarZIndex({ ...idle, isStickyNote: true })).toBe(ZIndex.stickyNote);
    expect(resolveTaskBarZIndex({ ...idle, isPhotoCard: true })).toBe(ZIndex.stickyNote);
    expect(ZIndex.stickyNote).toBeGreaterThan(ZIndex.stickyElevated);
  });

  it('still prefers drag, quick-add and long-hover over sticky notes', () => {
    expect(
      resolveTaskBarZIndex({ ...idle, effectiveIsDragging: true, isStickyNote: true })
    ).toBe(ZIndex.dragPreview);
    expect(
      resolveTaskBarZIndex({ ...idle, isStickyNote: true, quickAddMenu: {} })
    ).toBe(ZIndex.floatingControls);
    expect(
      resolveTaskBarZIndex({ ...idle, inlineTitleEditor: {}, isStickyNote: true })
    ).toBe(ZIndex.floatingControls);
    expect(
      resolveTaskBarZIndex({ ...idle, isStickyNote: true, shouldExpandByLongHover: true })
    ).toBe(ZIndex.arrowsHovered);
  });
});

describe('buildTaskBarLayoutStyle', () => {
  const base = {
    baseWidthCss: 'calc(10% - 16px)',
    customStyleLayout: { top: '12px', bottom: '12px' },
    displayLeftPercent: 5,
    expandedWidthCss: 'calc(20% - 16px)',
    hideSourceForOverlay: false,
    shouldExpandByLongHover: false,
  };

  it('keeps a fixed height for regular cards instead of stretching with the row', () => {
    const style = buildTaskBarLayoutStyle({
      ...base,
      customStyleLayout: { height: '58px', top: '12px' },
    });
    expect(style.height).toBe('58px');
    expect(style.bottom).toBe('auto');
    expect(style.aspectRatio).toBeUndefined();
  });

  it('scales photo card height by timeslot duration', () => {
    const style = buildTaskBarLayoutStyle({
      ...base,
      customStyleLayout: { height: '58px', top: '12px' },
      scaleHeightByDurationParts: 3,
    });
    expect(style.height).toBe('174px');
    expect(style.bottom).toBe('auto');
  });

  it('rescales a spanned photo while the duration preview changes', () => {
    const style = buildTaskBarLayoutStyle({
      ...base,
      committedHeightDurationParts: 3,
      customStyleLayout: { height: '174px', top: '12px' },
      scaleHeightByDurationParts: 2,
    });
    expect(style.height).toBe('116px');
  });
});

describe('scaleTaskBarHeightByDuration', () => {
  it('multiplies a one-card height by the number of timeslots', () => {
    expect(scaleTaskBarHeightByDuration('58px', 2)).toBe('116px');
    expect(scaleTaskBarHeightByDuration('58px', 1)).toBe('58px');
  });
});

describe('resolveTaskBarLongHoverExpand', () => {
  const base = {
    duration: 1,
    effectiveIsDragging: false,
    isDraftTask: false,
    isExpandedByLongHover: true,
    isResizing: false,
    swimlaneTimelineTotalParts: 40,
  };

  it('does not expand photo cards on long hover', () => {
    expect(resolveTaskBarLongHoverExpand({ ...base, isPhotoCard: true }).shouldExpandByLongHover).toBe(
      false
    );
  });

  it('does not expand while adding a link', () => {
    expect(resolveTaskBarLongHoverExpand({ ...base, isLinking: true }).shouldExpandByLongHover).toBe(
      false
    );
  });
});

describe('shouldStartLongHoverExpand', () => {
  const base = {
    effectiveIsDragging: false,
    isDraftTask: false,
    isNarrowForLongHoverExpand: true,
    isResizing: false,
  };

  it('starts expand for a narrow idle card', () => {
    expect(shouldStartLongHoverExpand(base)).toBe(true);
  });

  it('does not start expand while adding a link', () => {
    expect(shouldStartLongHoverExpand({ ...base, isLinking: true })).toBe(false);
  });
});

describe('shouldCancelInlineEditorOnFocusOut', () => {
  it('keeps editing when focus stays inside the card', () => {
    const next = { nodeType: 1 };
    expect(
      shouldCancelInlineEditorOnFocusOut({
        currentTarget: { contains: (node) => node === next },
        relatedTarget: next,
      })
    ).toBe(false);
  });

  it('cancels editing when focus leaves the card', () => {
    const root = { contains: () => false };
    expect(
      shouldCancelInlineEditorOnFocusOut({
        currentTarget: root,
        relatedTarget: { nodeType: 1 },
      })
    ).toBe(true);
    expect(
      shouldCancelInlineEditorOnFocusOut({
        currentTarget: root,
        relatedTarget: null,
      })
    ).toBe(true);
  });

  it('keeps a sticky-note draft when focus leaves the card', () => {
    expect(
      shouldCancelInlineEditorOnFocusOut({
        currentTarget: { contains: () => false },
        persistDraft: true,
        relatedTarget: null,
      })
    ).toBe(false);
  });
});

describe('resolveTaskBarEffectiveOpacity', () => {
  const task: Task = { id: 't1', link: '', name: 'Note', team: 'Back' };

  it('keeps confirmed cards fully opaque', () => {
    expect(
      resolveTaskBarEffectiveOpacity({
        contextMenuBlurOtherCards: false,
        contextMenuTaskId: null,
        task,
      })
    ).toBe(1);
  });

  it('dims MCP draft notes pending apply', () => {
    expect(
      resolveTaskBarEffectiveOpacity({
        contextMenuBlurOtherCards: false,
        contextMenuTaskId: null,
        task: { ...task, pendingApproval: true },
      })
    ).toBe(0.65);
  });
});
