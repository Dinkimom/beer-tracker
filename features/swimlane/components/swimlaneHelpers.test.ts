import type { Task } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it, vi } from 'vitest';

import {
  buildSwimlanePlacementQuickAddHandler,
  buildSwimlaneRootClassName,
  orderSwimlaneTasksForPaint,
  resolveSwimlaneAvailabilityTimeline,
  resolveSwimlaneDropPreviewTarget,
  resolveSwimlaneHasQuickAddDraftMode,
  resolveSwimlaneHideQuickAddPreview,
  resolveSwimlaneQuickAddLayoutState,
  resolveSwimlaneSecondaryLaneLayout,
} from './swimlaneHelpers';

describe('buildSwimlaneRootClassName', () => {
  it('disables row hover while another swimlane row is being resized', () => {
    expect(buildSwimlaneRootClassName(false)).toContain('swimlane-row-resizing:pointer-events-none');
    expect(buildSwimlaneRootClassName(false)).toContain('swimlane-lane-fill');
  });

  it('keeps row fill without a full-width border-b on the swimlane root', () => {
    expect(buildSwimlaneRootClassName(false)).toContain('bg-white');
    expect(buildSwimlaneRootClassName(false)).not.toContain('border-b');
  });
});

describe('buildSwimlanePlacementQuickAddHandler', () => {
  it('opens time off for the clicked working day', () => {
    const onOpenAvailabilityForDate = vi.fn();
    const onCreateTaskInCell = vi.fn();
    const handler = buildSwimlanePlacementQuickAddHandler({
      canQuickAddOnLane: true,
      developerId: 'dev-1',
      hasQuickAddDraftMode: false,
      onCreateTaskInCell,
      onOpenAvailabilityForDate,
      placementTool: 'availability',
      sprintStartDate: new Date(2026, 7, 31),
      sprintTimelineWorkingDays: 5,
    });

    handler?.({ day: 1, part: 0 });

    expect(onOpenAvailabilityForDate).toHaveBeenCalledWith('2026-09-01');
    expect(onCreateTaskInCell).not.toHaveBeenCalled();
  });

  it('creates a task draft when the task tool is selected', () => {
    const onCreateTaskInCell = vi.fn();
    const handler = buildSwimlanePlacementQuickAddHandler({
      canQuickAddOnLane: true,
      developerId: 'dev-1',
      hasQuickAddDraftMode: false,
      onCreateTaskInCell,
      onOpenAvailabilityForDate: vi.fn(),
      placementTool: 'task',
      sprintStartDate: new Date(2026, 7, 31),
      sprintTimelineWorkingDays: 5,
    });

    handler?.({ day: 2, part: 1 });

    expect(onCreateTaskInCell).toHaveBeenCalledWith({
      assigneeId: 'dev-1',
      day: 2,
      part: 1,
    });
  });

  it('does not attach + when the cursor tool is selected', () => {
    const onCreateTaskInCell = vi.fn();
    const handler = buildSwimlanePlacementQuickAddHandler({
      canQuickAddOnLane: true,
      developerId: 'dev-1',
      hasQuickAddDraftMode: false,
      onCreateTaskInCell,
      onOpenAvailabilityForDate: vi.fn(),
      placementTool: 'cursor',
      sprintStartDate: new Date(2026, 7, 31),
      sprintTimelineWorkingDays: 5,
    });

    expect(handler).toBeUndefined();
    expect(onCreateTaskInCell).not.toHaveBeenCalled();
  });

  it('does not attach + when the link tool is selected', () => {
    const onCreateTaskInCell = vi.fn();
    const handler = buildSwimlanePlacementQuickAddHandler({
      canQuickAddOnLane: true,
      developerId: 'dev-1',
      hasQuickAddDraftMode: false,
      onCreateTaskInCell,
      onOpenAvailabilityForDate: vi.fn(),
      placementTool: 'link',
      sprintStartDate: new Date(2026, 7, 31),
      sprintTimelineWorkingDays: 5,
    });

    expect(handler).toBeUndefined();
    expect(onCreateTaskInCell).not.toHaveBeenCalled();
  });
});

describe('resolveSwimlaneQuickAddLayoutState', () => {
  it('grows a photo-style row when hover plus starts on the first layer', () => {
    const state = resolveSwimlaneQuickAddLayoutState({
      canQuickAddOnLane: true,
      hoverPreview: { layer: 0, span: 2 },
      isDraggingTask: false,
      isLinking: false,
      placementTool: 'image',
      tasks: [],
    });
    expect(state.hideQuickAddPreview).toBe(false);
    expect(state.previewSpanLayers).toBe(2);
    expect(state.hoverMinTaskLayers).toBeUndefined();
    // Фото не укорачивается у конца спринта — ячейка, где 2 слота не влезают, недоступна (T4).
    expect(state.quickAddFootprint).toEqual({ durationCells: 2, mustFitSprint: true, span: 2 });
  });

  it('uses the same 2x2 hit target for tic-tac-toe as for a photo', () => {
    const state = resolveSwimlaneQuickAddLayoutState({
      canQuickAddOnLane: true,
      hoverPreview: { layer: 0, span: 2 },
      isDraggingTask: false,
      isLinking: false,
      placementTool: 'tictactoe',
      tasks: [],
    });
    expect(state.quickAddFootprint).toEqual({ durationCells: 2, span: 2 });
    expect(state.previewSpanLayers).toBe(2);
  });

  it('uses a full-day snap footprint for absence', () => {
    const state = resolveSwimlaneQuickAddLayoutState({
      canQuickAddOnLane: true,
      hoverPreview: { layer: 0, span: 1 },
      isDraggingTask: false,
      isLinking: false,
      placementTool: 'availability',
      tasks: [],
    });
    expect(state.quickAddFootprint.snapToDay).toBe(true);
    expect(state.quickAddFootprint.span).toBe(1);
    expect(state.quickAddFootprint.durationCells).toBeGreaterThan(1);
  });
});

describe('resolveSwimlaneDropPreviewTarget', () => {
  const activeTask: Task = {
    id: 'TASK-1',
    link: '',
    name: 'Task',
    status: 'todo',
    team: 'Back',
  };
  const base = {
    activeDraggableId: 'TASK-1',
    activeTask,
    activeTaskDuration: 2,
    developerId: 'dev-1',
    dropDisabled: false,
    hoveredCell: { assigneeId: 'dev-1', day: 1, part: 0 },
    isDraggingTask: true,
  };

  it('targets the lane under the pointer', () => {
    expect(resolveSwimlaneDropPreviewTarget(base)).toEqual({
      activeDraggableId: 'TASK-1',
      activeTask,
      durationCells: 2,
      hoveredCell: base.hoveredCell,
    });
  });

  it('skips other lanes and disabled drop targets', () => {
    expect(resolveSwimlaneDropPreviewTarget({ ...base, developerId: 'dev-2' })).toBeNull();
    expect(resolveSwimlaneDropPreviewTarget({ ...base, dropDisabled: true })).toBeNull();
    expect(resolveSwimlaneDropPreviewTarget({ ...base, isDraggingTask: false })).toBeNull();
  });
});

describe('resolveSwimlaneHideQuickAddPreview', () => {
  const visible = {
    canQuickAddOnLane: true,
    hasQuickAddDraftMode: false,
    isDraggingTask: false,
    isLinking: false,
  };

  it('keeps the hover plus while a placement tool can still add on the lane', () => {
    expect(resolveSwimlaneHideQuickAddPreview(visible)).toBe(false);
  });

  it('drops a leftover hover plus when Escape returns to the cursor tool', () => {
    expect(
      resolveSwimlaneHideQuickAddPreview({
        ...visible,
        canQuickAddOnLane: false,
      })
    ).toBe(true);
  });
});

describe('resolveSwimlaneHasQuickAddDraftMode', () => {
  it('hides + while a local draft is open', () => {
    expect(
      resolveSwimlaneHasQuickAddDraftMode([
        { id: 'local-task-1', isLocalTask: true },
        { id: 'comment:1' },
      ])
    ).toBe(true);
    expect(resolveSwimlaneHasQuickAddDraftMode([{ id: 'comment:1' }])).toBe(false);
  });

  it('hides + while a saved note is being edited', () => {
    expect(
      resolveSwimlaneHasQuickAddDraftMode([{ id: 'comment:1' }], {
        taskId: 'comment:1',
      })
    ).toBe(true);
  });
});

describe('resolveSwimlaneAvailabilityTimeline', () => {
  const sprintStartDate = new Date(2025, 7, 11);

  it('returns empty marks when the board has no availability events', () => {
    const result = resolveSwimlaneAvailabilityTimeline({
      boardEvents: undefined,
      developerId: 'dev-1',
      sprintStartDate,
      sprintTimelineWorkingDays: 5,
    });

    expect(result.availabilitySegments).toEqual([]);
    expect(result.unavailableDayHatchKinds.size).toBe(0);
  });

  it('builds hatch kinds for the assignee events', () => {
    const boardEvents: BoardAvailabilityEvent[] = [
      {
        endDate: '2025-08-11',
        eventType: 'duty',
        id: 'evt-1',
        memberId: 'dev-1',
        memberName: 'Dev',
        startDate: '2025-08-11',
      },
    ];
    const result = resolveSwimlaneAvailabilityTimeline({
      boardEvents,
      developerId: 'dev-1',
      sprintStartDate,
      sprintTimelineWorkingDays: 5,
    });

    expect(result.availabilitySegments).toHaveLength(1);
    expect(result.unavailableDayHatchKinds.get(0)).toBe('duty');
  });
});

describe('resolveSwimlaneSecondaryLaneLayout', () => {
  const base = { factExtra: 0, factLabel: 'Fact', taskBandHeight: 100 };

  it('keeps a single task band when the fact lane is off', () => {
    const layout = resolveSwimlaneSecondaryLaneLayout(base);

    expect(layout.laneLabels).toEqual([]);
    expect(layout.mainAreaHeight).toBe(100);
    expect(layout.timelineOuterHeight).toBe(100);
  });

  it('adds the fact lane label below the task band', () => {
    const layout = resolveSwimlaneSecondaryLaneLayout({ ...base, factExtra: 24 });

    expect(layout.mainAreaHeight).toBe(124);
    expect(layout.timelineOuterHeight).toBe(124);
    expect(layout.laneLabels).toEqual([{ accent: 'fact', heightPx: 24, label: 'Fact', topPx: 100 }]);
  });
});

describe('orderSwimlaneTasksForPaint', () => {
  it('paints lower rows first so hanging note reactions stay above the next row', () => {
    const items = [
      { task: { id: 'top-a' } },
      { task: { id: 'bottom' } },
      { task: { id: 'middle' } },
      { task: { id: 'top-b' } },
    ];
    const layers = new Map([
      ['top-a', 0],
      ['bottom', 2],
      ['middle', 1],
    ]);
    expect(orderSwimlaneTasksForPaint(items, layers).map((item) => item.task.id)).toEqual([
      'bottom',
      'middle',
      'top-a',
      'top-b',
    ]);
  });
});
