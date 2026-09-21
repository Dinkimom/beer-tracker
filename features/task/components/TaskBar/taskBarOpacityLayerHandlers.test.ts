/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { TASK_CARD_TITLE_DATA_ATTR, TASK_CARD_TITLE_OVERFLOW_DATA_ATTR } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';

import { buildTaskBarMouseEnterHandler, buildTaskBarMouseLeaveHandler, runTaskBarMouseEnter } from './taskBarOpacityLayerHandlers';

function createTaskCardWithTitleOverflow(overflows: boolean): HTMLDivElement {
  const title = document.createElement('div');
  title.setAttribute(TASK_CARD_TITLE_DATA_ATTR, '');
  title.setAttribute(TASK_CARD_TITLE_OVERFLOW_DATA_ATTR, overflows ? 'true' : 'false');
  const card = document.createElement('div');
  card.appendChild(title);
  return card;
}

describe('buildTaskBarMouseLeaveHandler', () => {
  it('does not collapse hover expand while this card context menu is open', () => {
    const setIsExpandedByLongHover = vi.fn();
    const handler = buildTaskBarMouseLeaveHandler({
      effectiveIsDragging: false,
      isContextMenuOpenForThis: true,
      isResizing: false,
      longHoverTimeoutRef: { current: null },
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler();

    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
  });

  it('collapses hover expand when the pointer leaves and no context menu is open', () => {
    const setIsExpandedByLongHover = vi.fn();
    const handler = buildTaskBarMouseLeaveHandler({
      effectiveIsDragging: false,
      isContextMenuOpenForThis: false,
      isResizing: false,
      longHoverTimeoutRef: { current: null },
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler();

    expect(setIsExpandedByLongHover).toHaveBeenCalledWith(false);
  });

  it('does not collapse or clear hover when the pointer moves onto a link delete handle', () => {
    const setIsExpandedByLongHover = vi.fn();
    const onTaskHover = vi.fn();
    const handle = document.createElement('button');
    handle.setAttribute('data-link-delete-handle', '');
    const icon = document.createElement('span');
    handle.appendChild(icon);
    document.body.appendChild(handle);

    const handler = buildTaskBarMouseLeaveHandler({
      effectiveIsDragging: false,
      isContextMenuOpenForThis: false,
      isResizing: false,
      longHoverTimeoutRef: { current: null },
      onTaskHover,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler({ relatedTarget: icon });

    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
    expect(onTaskHover).not.toHaveBeenCalled();
    handle.remove();
  });

  it('does not collapse or clear hover when the pointer moves onto a resize handle sibling', () => {
    const setIsExpandedByLongHover = vi.fn();
    const onTaskHover = vi.fn();
    const taskRoot = document.createElement('div');
    taskRoot.setAttribute('data-task-id', 'task-1');
    const resizeHit = document.createElement('div');
    resizeHit.className = 'task-bar-resize-handle-hit';
    taskRoot.appendChild(resizeHit);
    document.body.appendChild(taskRoot);

    const handler = buildTaskBarMouseLeaveHandler({
      effectiveIsDragging: false,
      isContextMenuOpenForThis: false,
      isResizing: false,
      longHoverTimeoutRef: { current: null },
      onTaskHover,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler({ relatedTarget: resizeHit });

    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
    expect(onTaskHover).not.toHaveBeenCalled();
    taskRoot.remove();
  });

  it('clears hover when the pointer leaves the task bar entirely', () => {
    const setIsExpandedByLongHover = vi.fn();
    const onTaskHover = vi.fn();
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    const handler = buildTaskBarMouseLeaveHandler({
      effectiveIsDragging: false,
      isContextMenuOpenForThis: false,
      isResizing: false,
      longHoverTimeoutRef: { current: null },
      onTaskHover,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler({ relatedTarget: outside });

    expect(setIsExpandedByLongHover).toHaveBeenCalledWith(false);
    expect(onTaskHover).toHaveBeenCalledWith(null);
    outside.remove();
  });
});

describe('buildTaskBarMouseEnterHandler', () => {
  it('does not start long-hover expand while adding a link', () => {
    vi.useFakeTimers();
    const setIsExpandedByLongHover = vi.fn();
    const longHoverTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const handler = buildTaskBarMouseEnterHandler({
      cardElementRef: { current: createTaskCardWithTitleOverflow(true) },
      effectiveIsDragging: false,
      isDraftTask: false,
      isLinking: true,
      isNarrowForLongHoverExpand: true,
      isResizing: false,
      longHoverTimeoutRef,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });

    handler();
    vi.runAllTimers();

    expect(longHoverTimeoutRef.current).toBeNull();
    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not start long-hover expand for comment cards without clipped text', () => {
    vi.useFakeTimers();
    const setIsExpandedByLongHover = vi.fn();
    const longHoverTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const handler = buildTaskBarMouseEnterHandler({
      effectiveIsDragging: false,
      isCommentCard: true,
      cardElementRef: { current: null },
      isDraftTask: false,
      isNarrowForLongHoverExpand: true,
      isResizing: false,
      longHoverTimeoutRef,
      setIsExpandedByLongHover,
      taskId: 'comment:c1',
    });

    handler();
    vi.runAllTimers();

    expect(longHoverTimeoutRef.current).toBeNull();
    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('starts long-hover expand for comment cards with clipped text', () => {
    vi.useFakeTimers();
    const setIsExpandedByLongHover = vi.fn();
    const longHoverTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const content = document.createElement('div');
    content.setAttribute('data-sticky-note-content', '');
    content.setAttribute('data-sticky-note-content-overflows', 'true');
    const card = document.createElement('div');
    card.appendChild(content);

    runTaskBarMouseEnter({
      cardElementRef: { current: card },
      effectiveIsDragging: false,
      isCommentCard: true,
      isDraftTask: false,
      isNarrowForLongHoverExpand: true,
      isResizing: false,
      longHoverTimeoutRef,
      setIsExpandedByLongHover,
      taskId: 'comment:c1',
    });
    vi.runAllTimers();

    expect(setIsExpandedByLongHover).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('does not start long-hover expand when the task title fits without clipping', () => {
    vi.useFakeTimers();
    const setIsExpandedByLongHover = vi.fn();
    const longHoverTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    runTaskBarMouseEnter({
      cardElementRef: { current: createTaskCardWithTitleOverflow(false) },
      effectiveIsDragging: false,
      isDraftTask: false,
      isNarrowForLongHoverExpand: true,
      isResizing: false,
      longHoverTimeoutRef,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });
    vi.runAllTimers();

    expect(longHoverTimeoutRef.current).toBeNull();
    expect(setIsExpandedByLongHover).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('starts long-hover expand when the task title is clipped', () => {
    vi.useFakeTimers();
    const setIsExpandedByLongHover = vi.fn();
    const longHoverTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    runTaskBarMouseEnter({
      cardElementRef: { current: createTaskCardWithTitleOverflow(true) },
      effectiveIsDragging: false,
      isDraftTask: false,
      isNarrowForLongHoverExpand: true,
      isResizing: false,
      longHoverTimeoutRef,
      setIsExpandedByLongHover,
      taskId: 'task-1',
    });
    vi.runAllTimers();

    expect(setIsExpandedByLongHover).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });
});
