import { describe, expect, it } from 'vitest';

import {
  pickSwimlaneDroppableByPointer,
  SIDEBAR_UNASSIGNED_DROPPABLE_ID,
  sprintPlannerCollisionDetection,
} from './sprintPlannerCollisionDetection';

function rect(top: number, bottom: number, left = 0, right = 800) {
  return { top, bottom, left, right, width: right - left, height: bottom - top };
}

describe('pickSwimlaneDroppableByPointer', () => {
  const lanes = [
    { id: 'swimlane-a', rect: rect(0, 100) },
    { id: 'swimlane-b', rect: rect(100, 220) },
    { id: 'swimlane-c', rect: rect(220, 300) },
  ];

  it('picks the lane whose Y-band contains the pointer', () => {
    expect(
      pickSwimlaneDroppableByPointer({ entries: lanes, pointerX: 100, pointerY: 150 })
    ).toBe('swimlane-b');
  });

  it('does not flip to a neighbor when X is near the right edge of the same Y-band', () => {
    expect(
      pickSwimlaneDroppableByPointer({ entries: lanes, pointerX: 790, pointerY: 40 })
    ).toBe('swimlane-a');
  });

  it('uses nearest midY when the pointer is in a vertical gap', () => {
    const withGap = [
      { id: 'swimlane-a', rect: rect(0, 90) },
      { id: 'swimlane-b', rect: rect(110, 200) },
    ];
    expect(
      pickSwimlaneDroppableByPointer({ entries: withGap, pointerX: 100, pointerY: 95 })
    ).toBe('swimlane-a');
    expect(
      pickSwimlaneDroppableByPointer({ entries: withGap, pointerX: 100, pointerY: 105 })
    ).toBe('swimlane-b');
  });
});

describe('sprintPlannerCollisionDetection', () => {
  function makeArgs(input: {
    kind?: string;
    sidebarDrop?: boolean;
    pointerX: number;
    pointerY: number;
  }) {
    const laneA = {
      id: 'swimlane-a',
      disabled: false,
      data: { current: {} },
      node: { current: null },
      rect: { current: rect(0, 100) },
    };
    const laneB = {
      id: 'swimlane-b',
      disabled: false,
      data: { current: {} },
      node: { current: null },
      rect: { current: rect(100, 200) },
    };
    const sidebar = {
      id: SIDEBAR_UNASSIGNED_DROPPABLE_ID,
      disabled: false,
      data: { current: {} },
      node: { current: null },
      rect: { current: rect(0, 800, 820, 1100) },
    };
    const droppableRects = new Map([
      ['swimlane-a', rect(0, 100)],
      ['swimlane-b', rect(100, 200)],
      [SIDEBAR_UNASSIGNED_DROPPABLE_ID, rect(0, 800, 820, 1100)],
    ]);

    return {
      active: {
        id: 'TASK-1',
        data: {
          current: {
            kind: input.kind ?? 'swimlane-task',
            ...(input.sidebarDrop === undefined ? {} : { sidebarDrop: input.sidebarDrop }),
          },
        },
        rect: { current: { initial: null, translated: null } },
      },
      collisionRect: rect(input.pointerY - 10, input.pointerY + 10, input.pointerX - 10, input.pointerX + 10),
      droppableContainers: [laneA, laneB, sidebar],
      droppableRects,
      pointerCoordinates: { x: input.pointerX, y: input.pointerY },
    } as unknown as Parameters<typeof sprintPlannerCollisionDetection>[0];
  }

  it('keeps the timeline lane when the pointer is on the right edge (not sidebar)', () => {
    const collisions = sprintPlannerCollisionDetection(
      makeArgs({ pointerX: 780, pointerY: 40 })
    );
    expect(collisions.map((c) => c.id)).toEqual(['swimlane-a']);
  });

  it('picks sidebar only when the pointer is inside the sidebar rect and not over a lane Y', () => {
    const collisions = sprintPlannerCollisionDetection(
      makeArgs({ pointerX: 900, pointerY: 400 })
    );
    expect(collisions.map((c) => c.id)).toEqual([SIDEBAR_UNASSIGNED_DROPPABLE_ID]);
  });

  it('prefers lane Y over sidebar even if collision center is closer to sidebar', () => {
    const collisions = sprintPlannerCollisionDetection(
      makeArgs({ pointerX: 700, pointerY: 150 })
    );
    expect(collisions.map((c) => c.id)).toEqual(['swimlane-b']);
  });

  it('never targets the sidebar for a card that cannot be dropped there', () => {
    const collisions = sprintPlannerCollisionDetection(
      makeArgs({ pointerX: 900, pointerY: 400, sidebarDrop: false })
    );
    expect(collisions.map((c) => c.id)).not.toContain(SIDEBAR_UNASSIGNED_DROPPABLE_ID);
  });
});
