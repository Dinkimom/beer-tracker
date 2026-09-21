/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import {
  LINK_ARROW_DELETE_BUTTON_SIZE_PX,
  bindLinkDeleteHandler,
  isEventTargetInsideTask,
  isLinkDeleteHandleEventTarget,
  isLinkDeleteHandleVisible,
  resolveLinkDeleteHandleOffset,
} from './linkArrowDeleteHandleHelpers';

function rect(left: number, top: number, width: number, height: number) {
  return {
    bottom: top + height,
    left,
    right: left + width,
    top,
  };
}

describe('resolveLinkDeleteHandleOffset', () => {
  const overlay = rect(10, 20, 400, 300);
  const from = rect(50, 80, 100, 40);
  const half = LINK_ARROW_DELETE_BUTTON_SIZE_PX / 2;

  it('centers the button on the right edge', () => {
    expect(resolveLinkDeleteHandleOffset(from, overlay, 'right')).toEqual({
      left: 150 - 10 - half,
      top: 100 - 20 - half,
    });
  });

  it('centers the button on the bottom edge', () => {
    expect(resolveLinkDeleteHandleOffset(from, overlay, 'bottom')).toEqual({
      left: 100 - 10 - half,
      top: 120 - 20 - half,
    });
  });

  it('applies a side offset from the midpoint', () => {
    expect(
      resolveLinkDeleteHandleOffset(from, overlay, {
        position: 'bottom',
        offset: { x: 16, y: 0 },
      })
    ).toEqual({
      left: 100 + 16 - 10 - half,
      top: 120 - 20 - half,
    });
  });
});

describe('isLinkDeleteHandleVisible', () => {
  it('shows the handle on the source card or when the link itself is hovered', () => {
    expect(
      isLinkDeleteHandleVisible({
        fromTaskId: 'from',
        handleId: 'link-1',
        hoveredLinkId: null,
        hoveredSourceId: 'from',
      })
    ).toBe(true);
    expect(
      isLinkDeleteHandleVisible({
        fromTaskId: 'from',
        handleId: 'link-1',
        hoveredLinkId: 'link-1',
        hoveredSourceId: null,
      })
    ).toBe(true);
    expect(
      isLinkDeleteHandleVisible({
        fromTaskId: 'from',
        handleId: 'link-1',
        hoveredLinkId: null,
        hoveredSourceId: 'other',
      })
    ).toBe(false);
  });

  it('shows every handle when link mode is on', () => {
    expect(
      isLinkDeleteHandleVisible({
        fromTaskId: 'from',
        handleId: 'link-1',
        hoveredLinkId: null,
        hoveredSourceId: null,
        showAll: true,
      })
    ).toBe(true);
  });
});

describe('bindLinkDeleteHandler', () => {
  it('clears hover then deletes, and is a no-op when delete is not provided', () => {
    const onDeleteLink = vi.fn();
    const clearHover = vi.fn();
    const bound = bindLinkDeleteHandler(onDeleteLink, clearHover);
    bound?.('link-1');
    expect(clearHover).toHaveBeenCalledOnce();
    expect(onDeleteLink).toHaveBeenCalledWith('link-1');
    expect(bindLinkDeleteHandler(undefined, clearHover)).toBeUndefined();
  });
});

describe('isLinkDeleteHandleEventTarget', () => {
  it('matches the handle and nested descendants', () => {
    const handle = document.createElement('button');
    handle.setAttribute('data-link-delete-handle', '');
    const icon = document.createElement('span');
    handle.appendChild(icon);
    expect(isLinkDeleteHandleEventTarget(handle)).toBe(true);
    expect(isLinkDeleteHandleEventTarget(icon)).toBe(true);
    expect(isLinkDeleteHandleEventTarget(document.createElement('div'))).toBe(false);
    expect(isLinkDeleteHandleEventTarget(null)).toBe(false);
  });
});

describe('isEventTargetInsideTask', () => {
  it('matches nested nodes on the source card including colon ids', () => {
    const card = document.createElement('div');
    card.setAttribute('data-task-id', 'comment:abc');
    const inner = document.createElement('span');
    card.appendChild(inner);
    expect(isEventTargetInsideTask(inner, 'comment:abc')).toBe(true);
    expect(isEventTargetInsideTask(inner, 'other')).toBe(false);
    expect(isEventTargetInsideTask(null, 'comment:abc')).toBe(false);
  });
});
