/**
 * DnD свимлейна: сайдбар принимает только работу из трекера; дроп из бэклога без ячейки отменяется.
 */

import type { SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSwimlaneDragEndHandler, createSwimlaneDragOverHandler } from './swimlaneDragHandlers';
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

describe('swimlane drag end: sidebar and backlog routing', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    mockCalculateCell.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('snaps a note back when it is released over the sidebar (no delete, no update)', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 9, part: 2 });
    const state = dragState({ activeTaskId: 'comment:n1', activeDraggableId: 'comment:n1' });
    const existing: TaskPosition = {
      taskId: 'comment:n1',
      assignee: 'dev1',
      startDay: 0,
      startPart: 0,
      duration: 1,
    };
    const onPositionDelete = vi.fn();
    const onPositionUpdate = vi.fn();
    const canDropOnSidebar = vi.fn((taskId: string) => !taskId.startsWith('comment:'));
    const handler = createSwimlaneDragEndHandler({
      canDropOnSidebar,
      tasks: [task({ id: 'comment:n1', localDraftKind: 'comment' })],
      taskPositions: new Map([['comment:n1', existing]]),
      dragState: state,
      dragContextRef: {
        current: { isDragFromSidebar: false, sidebarOpen: true, sidebarWidth: 320, viewportWidth: 1200 },
      },
      onPositionDelete,
      onPositionUpdate,
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ activeId: 'comment:n1', overId: 'sidebar-unassigned' }));
    expect(canDropOnSidebar).toHaveBeenCalledWith('comment:n1');
    expect(onPositionDelete).not.toHaveBeenCalled();
    expect(onPositionUpdate).not.toHaveBeenCalled();
    expect(state.resetDragState).toHaveBeenCalledTimes(1);
  });

  it('still removes a tracker task dropped on the sidebar when the predicate allows it', () => {
    const onPositionDelete = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      canDropOnSidebar: () => true,
      tasks: [task({ id: 't1' })],
      taskPositions: new Map([['t1', { taskId: 't1', assignee: 'dev1', startDay: 0, startPart: 0, duration: 1 }]]),
      dragState: dragState(),
      dragContextRef: {
        current: { isDragFromSidebar: false, sidebarOpen: true, sidebarWidth: 320, viewportWidth: 1200 },
      },
      onPositionDelete,
      onPositionUpdate: vi.fn(),
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ overId: 'sidebar-unassigned' }));
    expect(onPositionDelete).toHaveBeenCalledWith('t1');
  });

  it('cancels a backlog drop when the target cell cannot be resolved (no 0,0 fallback)', () => {
    mockCalculateCell.mockReturnValue(null);
    const onBacklogTaskDrop = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [],
      taskPositions: new Map(),
      dragState: dragState({ activeTaskId: 'BL-1', activeDraggableId: 'BL-1', mousePositionRef: { current: { x: 200, y: 10 } } }),
      dragContextRef: {
        current: { isDragFromSidebar: true, sidebarOpen: false, sidebarWidth: 0, viewportWidth: 1200 },
      },
      onBacklogTaskDrop,
      onPositionDelete: vi.fn(),
      onPositionUpdate: vi.fn(),
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ activeId: 'BL-1', overId: 'swimlane-dev1', cardCenterX: 200 }));
    expect(onBacklogTaskDrop).not.toHaveBeenCalled();
  });

  it('passes the resolved cell for a backlog drop', () => {
    mockCalculateCell.mockReturnValue({ assigneeId: 'dev1', day: 2, part: 1 });
    const onBacklogTaskDrop = vi.fn();
    const handler = createSwimlaneDragEndHandler({
      tasks: [],
      taskPositions: new Map(),
      dragState: dragState({ activeTaskId: 'BL-1', activeDraggableId: 'BL-1', mousePositionRef: { current: { x: 200, y: 10 } } }),
      dragContextRef: {
        current: { isDragFromSidebar: true, sidebarOpen: false, sidebarWidth: 0, viewportWidth: 1200 },
      },
      onBacklogTaskDrop,
      onPositionDelete: vi.fn(),
      onPositionUpdate: vi.fn(),
      updateXarrow: vi.fn(),
    });
    handler(dragEnd({ activeId: 'BL-1', overId: 'swimlane-dev1', cardCenterX: 200 }));
    expect(onBacklogTaskDrop).toHaveBeenCalledWith('BL-1', 'dev1', 2, 1);
  });
});

describe('createSwimlaneDragOverHandler sidebar preview', () => {
  function overSidebar(activeId: string) {
    return {
      active: { id: activeId, rect: { current: { translated: null } } },
      over: { id: 'sidebar-unassigned' },
    } as unknown as Parameters<ReturnType<typeof createSwimlaneDragOverHandler>>[0];
  }
  const ctx = {
    current: { isDragFromSidebar: false, sidebarOpen: true, sidebarWidth: 320, viewportWidth: 1200 },
  };

  it('does not highlight the sidebar for a note', () => {
    const state = dragState({ activeTaskId: 'comment:n1', activeDraggableId: 'comment:n1' });
    const handler = createSwimlaneDragOverHandler({
      canDropOnSidebar: () => false,
      dragContextRef: ctx,
      dragState: state,
      taskPositions: new Map(),
      tasks: [task({ id: 'comment:n1', localDraftKind: 'comment' })],
    });
    handler(overSidebar('comment:n1'));
    expect(state.setSidebarDropPreview).toHaveBeenCalledWith({ active: false, pointerY: null });
  });

  it('highlights the sidebar for a tracker task', () => {
    const state = dragState();
    const handler = createSwimlaneDragOverHandler({
      canDropOnSidebar: () => true,
      dragContextRef: ctx,
      dragState: state,
      taskPositions: new Map(),
      tasks: [task({ id: 't1' })],
    });
    handler(overSidebar('t1'));
    expect(state.setSidebarDropPreview).toHaveBeenCalledWith({ active: true, pointerY: 120 });
  });
});
