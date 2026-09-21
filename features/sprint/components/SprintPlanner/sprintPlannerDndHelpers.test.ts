import type { DragEndEvent } from '@dnd-kit/core';

import { describe, expect, it, vi } from 'vitest';

import { SWIMLANE_DEVELOPER_ROW_DRAG_KIND } from '@/features/swimlane/utils/swimlaneDragIds';

import {
  resolveSwimlanePlannerAutoScrollOptions,
  runDeveloperRowDragEndIfApplicable,
} from './sprintPlannerDndHelpers';

function makeDragEndEvent(partial: {
  activeId: string;
  activeData?: { kind?: string };
  overId?: string;
}): DragEndEvent {
  return {
    active: {
      id: partial.activeId,
      data: { current: partial.activeData ?? { kind: SWIMLANE_DEVELOPER_ROW_DRAG_KIND } },
    },
    over: partial.overId
      ? { id: partial.overId, data: { current: {} }, rect: {} as never, disabled: false }
      : null,
  } as DragEndEvent;
}

describe('runDeveloperRowDragEndIfApplicable', () => {
  it('calls onReorder when over is swimlane droppable', () => {
    const onReorder = vi.fn();
    runDeveloperRowDragEndIfApplicable(
      makeDragEndEvent({
        activeId: 'swimlane-dev-a',
        overId: 'swimlane-dev-b',
      }),
      onReorder
    );
    expect(onReorder).toHaveBeenCalledWith('dev-a', 'dev-b');
  });

  it('does not call onReorder when over is missing', () => {
    const onReorder = vi.fn();
    runDeveloperRowDragEndIfApplicable(
      makeDragEndEvent({
        activeId: 'swimlane-dev-a',
        overId: undefined,
      }),
      onReorder
    );
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe('resolveSwimlanePlannerAutoScrollOptions', () => {
  it('enables auto-scroll for people and feature swimlane modes', () => {
    const scrollContainerRef = { current: {} as HTMLDivElement };

    expect(resolveSwimlanePlannerAutoScrollOptions('full', scrollContainerRef)).toMatchObject({
      enabled: true,
      threshold: { x: 0.12, y: 0.12 },
    });
    expect(resolveSwimlanePlannerAutoScrollOptions('compact', scrollContainerRef)).toMatchObject({
      enabled: true,
    });
    expect(resolveSwimlanePlannerAutoScrollOptions('features', scrollContainerRef)).toMatchObject({
      enabled: true,
    });
    expect(resolveSwimlanePlannerAutoScrollOptions('kanban', scrollContainerRef)).toBe(false);
    expect(resolveSwimlanePlannerAutoScrollOptions('occupancy', scrollContainerRef)).toBe(false);
  });

  it('allows scrolling only the swimlane scroll container', () => {
    const scrollContainer = {} as HTMLDivElement;
    const otherScrollContainer = {} as HTMLDivElement;
    const scrollContainerRef = { current: scrollContainer };
    const options = resolveSwimlanePlannerAutoScrollOptions('full', scrollContainerRef);

    expect(typeof options).toBe('object');
    if (typeof options !== 'object' || options.enabled !== true) {
      throw new Error('Expected enabled auto-scroll options');
    }

    expect(options.canScroll?.(scrollContainer)).toBe(true);
    expect(options.canScroll?.(otherScrollContainer)).toBe(false);
  });
});
