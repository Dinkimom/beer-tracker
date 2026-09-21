import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it, vi } from 'vitest';

import { CALENDAR_BUSY_LANE_HEIGHT_PX } from '@/features/swimlane/components/SwimlaneCalendarBusyLane';

import {
  buildSwimlanePlacementQuickAddHandler,
  buildSwimlaneRootClassName,
  resolveSwimlaneAvailabilityTimeline,
  resolveSwimlaneHasQuickAddDraftMode,
  resolveSwimlaneHideQuickAddPreview,
  resolveSwimlaneQuickAddLayoutState,
  resolveSwimlaneSecondaryLaneLayout,
} from './swimlaneHelpers';

describe('buildSwimlaneRootClassName', () => {
  it('disables row hover while another swimlane row is being resized', () => {
    expect(buildSwimlaneRootClassName(false)).toContain('swimlane-row-resizing:pointer-events-none');
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
    expect(state.quickAddFootprint).toEqual({ durationCells: 2, span: 2 });
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
      titleForKind: () => 'Duty',
    });

    expect(result.availabilitySegments).toEqual([]);
    expect(result.unavailableDayHatchKinds.size).toBe(0);
    expect(result.unavailableDayTitles.size).toBe(0);
  });

  it('builds hatch kinds and titles for the assignee events', () => {
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
      titleForKind: (kind) => kind,
    });

    expect(result.availabilitySegments).toHaveLength(1);
    expect(result.unavailableDayHatchKinds.get(0)).toBe('duty');
    expect(result.unavailableDayTitles.get(0)).toContain('duty');
  });
});

describe('resolveSwimlaneSecondaryLaneLayout', () => {
  const base = {
    calendarBusySegmentCount: 0,
    calendarBusyVisible: false,
    calendarLabel: 'Calendar',
    factExtra: 0,
    factLabel: 'Fact',
    taskBandHeight: 100,
  };

  it('keeps a single task band when fact and calendar lanes are off', () => {
    const layout = resolveSwimlaneSecondaryLaneLayout(base);

    expect(layout.laneLabels).toEqual([]);
    expect(layout.mainAreaHeight).toBe(100);
    expect(layout.timelineOuterHeight).toBe(100);
    expect(layout.calendarBusyLaneVisible).toBe(false);
  });

  it('stacks fact and calendar labels with matching heights', () => {
    const layout = resolveSwimlaneSecondaryLaneLayout({
      ...base,
      calendarBusySegmentCount: 2,
      calendarBusyVisible: true,
      factExtra: 24,
    });

    expect(layout.mainAreaHeight).toBe(124);
    expect(layout.timelineOuterHeight).toBe(124 + CALENDAR_BUSY_LANE_HEIGHT_PX);
    expect(layout.laneLabels).toEqual([
      { accent: 'fact', heightPx: 24, label: 'Fact', topPx: 100 },
      {
        accent: 'calendar',
        heightPx: CALENDAR_BUSY_LANE_HEIGHT_PX,
        label: 'Calendar',
        topPx: 124,
      },
    ]);
  });

  it('hides the calendar lane when busy segments are empty', () => {
    const layout = resolveSwimlaneSecondaryLaneLayout({
      ...base,
      calendarBusyVisible: true,
    });

    expect(layout.calendarBusyLaneVisible).toBe(false);
    expect(layout.laneLabels).toEqual([]);
  });
});
