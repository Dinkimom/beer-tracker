/**
 * Покрывает ветки окончания DnD для свимлейна — та же логика, что экспортирует `useDragEnd`
 * через `createSwimlaneDragEndHandler`.
 */

import type { SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSwimlaneDragEndHandler, createSwimlaneDragStartHandler } from './swimlaneDragHandlers';
import { calculateCellFromDragEvent } from './swimlaneDragPositionCalculation';

vi.mock('./swimlaneDragPositionCalculation', () => ({
  calculateCellFromDragEvent: vi.fn(),
}));

const mockCalculateCell = vi.mocked(calculateCellFromDragEvent);

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    link: '',
    name: partial.id,
    team: 'Web',
    storyPoints: 1,
    ...partial,
  };
}

function dragState(overrides: Partial<SwimlaneDragStateApi> = {}): SwimlaneDragStateApi {
  return {
    activeDraggableId: 't1',
    activeTaskId: 't1',
    hoveredCell: null,
    isDraggingTask: true,
    isSidebarDropTarget: false,
    sidebarDropPointerY: null,
    mousePositionRef: { current: { x: 800, y: 120 } },
    beginDragSession: vi.fn(),
    resetDragState: vi.fn(),
    setHoveredCell: vi.fn(),
    setSidebarDropPreview: vi.fn(),
    ...overrides,
  };
}

function dragEnd(partial: {
  activeId?: string;
  overId?: string | null;
  pointerX?: number;
  cardCenterX?: number;
}): DragEndEvent {
  const activeId = partial.activeId ?? 't1';
  const overId = partial.overId ?? 'cell-dev1-0-0';
  const x = partial.cardCenterX ?? 600;
  return {
    active: {
      id: activeId,
      rect: {
        current: {
          translated: { left: x - 50, width: 100, top: 0, height: 40 },
        },
      },
    },
    over: overId == null ? null : { id: overId },
  } as unknown as DragEndEvent;
}

describe('createSwimlaneDragEndHandler', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      }
    );
    mockCalculateCell.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when over is null (cancel / drop outside)', () => {
    const state = dragState();
    const onPositionDelete = vi.fn();
    const onPositionUpdate = vi.fn();
    const updateXarrow = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map(),
      dragState: state,
      onPositionDelete,
      onPositionUpdate,
      updateXarrow,
    });
    handler(dragEnd({ overId: null }));
    expect(onPositionDelete).not.toHaveBeenCalled();
    expect(onPositionUpdate).not.toHaveBeenCalled();
    expect(updateXarrow).not.toHaveBeenCalled();
    expect(state.resetDragState).toHaveBeenCalledTimes(1);
  });

  it('deletes position when dropped on sidebar-unassigned', () => {
    const state = dragState();
    const onPositionDelete = vi.fn();
    const positions = new Map<string, TaskPosition>([
      [
        't1',
        {
          taskId: 't1',
          assignee: 'dev1',
          startDay: 0,
          startPart: 0,
          duration: 2,
        },
      ],
    ]);
    const dragContextRef = {
      current: {
        isDragFromSidebar: false,
        sidebarOpen: true,
        sidebarWidth: 320,
        viewportWidth: 1200,
      },
    };
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: positions,
      dragState: state,
      dragContextRef,
      onPositionDelete: onPositionDelete,
      onPositionUpdate: vi.fn(),
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ overId: 'sidebar-unassigned' }));
    expect(onPositionDelete).toHaveBeenCalledWith('t1');
    expect(state.resetDragState).toHaveBeenCalled();
  });

  it('deletes when pointer is in open right sidebar during drag-from-sidebar', () => {
    const viewportWidth = 1200;
    const sidebarWidth = 320;
    const state = dragState({
      mousePositionRef: { current: { x: viewportWidth - 40, y: 10 } },
    });
    const onPositionDelete = vi.fn();
    const dragContextRef = {
      current: {
        isDragFromSidebar: true,
        sidebarOpen: true,
        sidebarWidth,
        viewportWidth,
      },
    };
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map(),
      dragState: state,
      dragContextRef,
      onPositionDelete,
      onPositionUpdate: vi.fn(),
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ overId: 'cell-dev1-1-0', cardCenterX: 200 }));
    expect(onPositionDelete).toHaveBeenCalledWith('t1');
  });

  it('places on swimlane when pointer is on left timeline (not mistaken for sidebar)', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 0, part: 0 });
    const state = dragState({
      mousePositionRef: { current: { x: 280, y: 120 } },
      activeTaskId: 'new1',
    });
    const onPositionDelete = vi.fn();
    const onPositionUpdate = vi.fn();
    const dragContextRef = {
      current: {
        isDragFromSidebar: true,
        sidebarOpen: true,
        sidebarWidth: 320,
        viewportWidth: 1200,
      },
    };
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 'new1' })],
      taskPositions: new Map(),
      dragState: state,
      dragContextRef,
      onPositionDelete,
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(
      dragEnd({
        activeId: 'new1',
        overId: 'cell-dev1-0-0',
        cardCenterX: 300,
      })
    );
    expect(onPositionDelete).not.toHaveBeenCalled();
    expect(onPositionUpdate).toHaveBeenCalledWith(
      'new1',
      expect.objectContaining({ startDay: 0, startPart: 0, assignee: 'dev1' })
    );
  });

  it('deletes when overlay is over right sidebar but collision returned a swimlane cell', () => {
    const viewportWidth = 1200;
    const sidebarWidth = 320;
    const state = dragState({
      mousePositionRef: { current: { x: 400, y: 120 } },
      activeTaskId: 'new1',
    });
    const onPositionDelete = vi.fn();
    const onPositionUpdate = vi.fn();
    const dragContextRef = {
      current: {
        isDragFromSidebar: true,
        sidebarOpen: true,
        sidebarWidth,
        viewportWidth,
      },
    };
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 'new1' })],
      taskPositions: new Map(),
      dragState: state,
      dragContextRef,
      onPositionDelete,
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(
      dragEnd({
        activeId: 'new1',
        overId: 'cell-dev1-4-0',
        cardCenterX: viewportWidth - 60,
      })
    );
    expect(onPositionDelete).toHaveBeenCalledWith('new1');
    expect(onPositionUpdate).not.toHaveBeenCalled();
  });

  it('calls onPositionUpdate when dropping task that only exists in tasks (no prior position)', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 2, part: 1 });
    const state = dragState({ activeTaskId: 'new1' });
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 'new1', storyPoints: 2 })],
      taskPositions: new Map(),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(
      dragEnd({
        activeId: 'new1',
        overId: 'swimlane-dev1',
      })
    );
    expect(onPositionUpdate).toHaveBeenCalledWith(
      'new1',
      expect.objectContaining({
        taskId: 'new1',
        assignee: 'dev1',
        startDay: 2,
        startPart: 1,
      })
    );
    expect(onPositionUpdate.mock.calls[0][1].duration).toBeGreaterThanOrEqual(1);
  });

  it('allows dropping a tracker task onto the team lane', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: '__team__', day: 1, part: 0 });
    const state = dragState();
    const existing: TaskPosition = {
      taskId: 't1',
      assignee: 'dev1',
      startDay: 0,
      startPart: 0,
      duration: 2,
    };
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map([['t1', existing]]),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ overId: 'cell-__team__-1-0' }));
    expect(onPositionUpdate).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        assignee: '__team__',
        startDay: 1,
        startPart: 0,
      })
    );
  });

  it('allows dropping a sticky note onto the team lane', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: '__team__', day: 1, part: 0 });
    const state = dragState({ activeTaskId: 'comment:n1', activeDraggableId: 'comment:n1' });
    const existing: TaskPosition = {
      taskId: 'comment:n1',
      assignee: 'dev1',
      startDay: 0,
      startPart: 0,
      duration: 1,
    };
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 'comment:n1', localDraftKind: 'comment' })],
      taskPositions: new Map([['comment:n1', existing]]),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ activeId: 'comment:n1', overId: 'cell-__team__-1-0' }));
    expect(onPositionUpdate).toHaveBeenCalledWith(
      'comment:n1',
      expect.objectContaining({
        assignee: '__team__',
        startDay: 1,
        startPart: 0,
      })
    );
  });

  it('moves existing single-segment position to calculated cell', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 3, part: 0 });
    const state = dragState();
    const existing: TaskPosition = {
      taskId: 't1',
      assignee: 'dev1',
      startDay: 0,
      startPart: 0,
      duration: 2,
    };
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map([['t1', existing]]),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({}));
    expect(onPositionUpdate).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        assignee: 'dev1',
        startDay: 3,
        startPart: 0,
      })
    );
  });

  it('prefers hoveredCell over calculated cell when assignee matches', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 0, part: 0 });
    const state = dragState({
      hoveredCell: { assigneeId: 'dev1', day: 4, part: 2 },
    });
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map([
        [
          't1',
          {
            taskId: 't1',
            assignee: 'dev1',
            startDay: 0,
            startPart: 0,
            duration: 1,
          },
        ],
      ]),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({}));
    expect(onPositionUpdate).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        startDay: 4,
        startPart: 2,
      })
    );
  });

  it('skips onPositionUpdate when final cell is invalid', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 99, part: 0 });
    const state = dragState();
    const onPositionUpdate = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [task({ id: 't1' })],
      taskPositions: new Map([
        [
          't1',
          {
            taskId: 't1',
            assignee: 'dev1',
            startDay: 0,
            startPart: 0,
            duration: 1,
          },
        ],
      ]),
      dragState: state,
      onPositionDelete: vi.fn(),
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({}));
    expect(onPositionUpdate).not.toHaveBeenCalled();
    expect(state.resetDragState).toHaveBeenCalled();
  });
});

describe('createSwimlaneDragStartHandler', () => {
  it('starts drag session for sidebar-sourced task not in sprint context', () => {
    const state = dragState({ isDraggingTask: false, activeTaskId: null });
    const handler = createSwimlaneDragStartHandler({
      dragState: state,
      taskPositions: new Map(),
      tasks: [],
    });

    handler({
      active: {
        id: 'BUG-42',
        data: { current: { source: 'sidebar' } },
      },
    } as unknown as DragStartEvent);

    expect(state.beginDragSession).toHaveBeenCalledWith('BUG-42', 'BUG-42');
  });

  it('ignores unknown task when not from sidebar', () => {
    const state = dragState({ isDraggingTask: false, activeTaskId: null });
    const handler = createSwimlaneDragStartHandler({
      dragState: state,
      taskPositions: new Map(),
      tasks: [],
    });

    handler({
      active: { id: 'BUG-42', data: { current: {} } },
    } as unknown as DragStartEvent);

    expect(state.beginDragSession).not.toHaveBeenCalled();
  });
});
