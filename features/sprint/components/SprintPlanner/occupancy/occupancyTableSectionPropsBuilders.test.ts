import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import {
  buildOccupancyTableBodyProps,
  buildOccupancyTableHeaderProps,
  buildOccupancyTableSectionProps,
  buildOccupancyTaskArrowsProps,
  type OccupancyTableBodyPropsCore,
  type OccupancyTableHeaderPropsCore,
} from './occupancyTableSectionPropsBuilders';

describe('buildOccupancyTableHeaderProps', () => {
  it('replaces error maps with empty collections when quarterlyPhaseStyle is true', () => {
    const core = {
      allExpanded: true,
      dayColumnWidth: 10,
      displayColumnCount: 10,
      errorDayDetails: new Map([[0, []]]),
      errorDayIndices: new Set([0, 1]),
      holidayDayIndices: new Set<number>(),
      isReorderMode: false,
      isResizing: false,
      parentIds: [] as string[],
      setIsReorderMode: () => {},
      setIsResizing: () => {},
      sprintStartDate: new Date('2025-01-01'),
      taskColumnWidth: 100,
      tasks: [],
      totalStoryPoints: 0,
      totalTestPoints: 0,
      onCollapseAll: () => {},
      onExpandAll: () => {},
      onHoveredErrorTaskIdChange: () => {},
    } satisfies OccupancyTableHeaderPropsCore;

    const out = buildOccupancyTableHeaderProps(true, core);
    expect(out.errorDayDetails.size).toBe(0);
    expect(out.errorDayIndices.size).toBe(0);
    expect(out.showHolidayEmoji).toBe(false);
  });

  it('preserves error maps when quarterlyPhaseStyle is false', () => {
    const details = new Map([[2, []]]);
    const indices = new Set([2]);
    const core = {
      allExpanded: true,
      dayColumnWidth: 10,
      displayColumnCount: 10,
      errorDayDetails: details,
      errorDayIndices: indices,
      holidayDayIndices: new Set<number>(),
      isReorderMode: false,
      isResizing: false,
      parentIds: [] as string[],
      setIsReorderMode: () => {},
      setIsResizing: () => {},
      sprintStartDate: new Date('2025-01-01'),
      taskColumnWidth: 100,
      tasks: [],
      totalStoryPoints: 0,
      totalTestPoints: 0,
      onCollapseAll: () => {},
      onExpandAll: () => {},
      onHoveredErrorTaskIdChange: () => {},
    } satisfies OccupancyTableHeaderPropsCore;

    const out = buildOccupancyTableHeaderProps(false, core);
    expect(out.errorDayDetails).toBe(details);
    expect(out.errorDayIndices).toBe(indices);
    expect(out.showHolidayEmoji).toBeUndefined();
  });
});

describe('buildOccupancyTableBodyProps', () => {
  it('clears error collections when quarterlyPhaseStyle is true', () => {
    const reasons = new Map([['t1', ['e']]]);
    const ids = new Set(['t1']);
    const core = {
      assigneeIdToTaskPositions: new Map(),
      availabilityDevelopersWithSegments: [],
      cellsPerDay: 3 as const,
      collapsedParents: new Set(),
      dayColumnWidth: 10,
      developerMap: new Map(),
      displayColumnCount: 10,
      factChangelogs: new Map(),
      factComments: new Map(),
      factDurations: new Map(),
      factVisible: false,
      gitlabFactByLink: {},
      getRowId: () => '',
      globalNameFilter: '',
      goalStoryEpicNames: new Set(),
      handleEmptyCellClick: () => {},
      handlePositionPreview: () => {},
      headerHeight: 40,
      holidayDayIndices: new Set(),
      hoverConnectedPhaseIds: null,
      hoveredPhaseTaskId: null,
      isReorderMode: false,
      legacyCompactLayout: false,
      linkingFromTaskId: null,
      occupancyErrorReasons: reasons,
      occupancyErrorTaskIds: ids,
      overlappingTaskIds: new Set(),
      parentStatuses: undefined,
      parentTypes: undefined,
      positionPreviews: new Map(),
      quarterlyPhaseStyle: false,
      rowFieldsVisibility: undefined,
      segmentEditTaskId: null,
      setHoveredPhaseTaskId: () => {},
      setTaskRowRef: () => () => {},
      sortableRowIds: [],
      sourceRowEndCell: null,
      sourceRowPhaseIds: null,
      sprintStartDate: new Date(),
      taskColumnWidth: 100,
      taskLinks: [],
      taskPositions: new Map(),
      taskRowHeights: new Map(),
      timelineSettings: {
        showComments: true,
        showFreeSlotPreview: true,
        showGitlab: true,
        showLinks: true,
        showReestimations: true,
        showStatuses: true,
      },
      toggleParent: () => {},
      totalParts: 30,
      visibleRows: [],
      workingDays: 10,
    } satisfies OccupancyTableBodyPropsCore;

    const out = buildOccupancyTableBodyProps(true, core);
    expect(out.occupancyErrorReasons.size).toBe(0);
    expect(out.occupancyErrorTaskIds.size).toBe(0);
  });
});

describe('buildOccupancyTaskArrowsProps', () => {
  it('returns null when showLinks is false', () => {
    expect(
      buildOccupancyTaskArrowsProps(false, {
        devToQaTaskId: new Map(),
        hoveredPhaseTaskId: null,
        linkingFromTaskId: null,
        segmentEditTaskId: null,
        taskIdsOrder: [],
        taskLinks: [],
        taskPositions: new Map(),
        tasksMap: new Map(),
      })
    ).toBeNull();
  });

  it('returns props when showLinks is true', () => {
    const props = {
      devToQaTaskId: new Map(),
      hoveredPhaseTaskId: null,
      linkingFromTaskId: null,
      segmentEditTaskId: null,
      taskIdsOrder: ['a'],
      taskLinks: [],
      taskPositions: new Map(),
      tasksMap: new Map(),
    };
    expect(buildOccupancyTaskArrowsProps(true, props)).toBe(props);
  });
});

describe('buildOccupancyTableSectionProps', () => {
  const noopDragEnd = () => {};
  const noopTableClick = () => {};

  const minimalHeaderCore = {
    allExpanded: true,
    dayColumnWidth: 10,
    displayColumnCount: 10,
    errorDayDetails: new Map([[0, []]]),
    errorDayIndices: new Set([0]),
    holidayDayIndices: new Set<number>(),
    isReorderMode: false,
    isResizing: false,
    parentIds: [] as string[],
    setIsReorderMode: () => {},
    setIsResizing: () => {},
    sprintStartDate: new Date('2025-01-01'),
    taskColumnWidth: 100,
    tasks: [],
    totalStoryPoints: 0,
    totalTestPoints: 0,
    onCollapseAll: () => {},
    onExpandAll: () => {},
    onHoveredErrorTaskIdChange: () => {},
  } satisfies OccupancyTableHeaderPropsCore;

  const minimalBodyCore = {
    assigneeIdToTaskPositions: new Map(),
    availabilityDevelopersWithSegments: [],
    cellsPerDay: 3 as const,
    collapsedParents: new Set(),
    dayColumnWidth: 10,
    developerMap: new Map(),
    displayColumnCount: 10,
    factChangelogs: new Map(),
    factComments: new Map(),
    factDurations: new Map(),
    factVisible: false,
    gitlabFactByLink: {},
    getRowId: () => '',
    globalNameFilter: '',
    goalStoryEpicNames: new Set(),
    handleEmptyCellClick: () => {},
    handlePositionPreview: () => {},
    headerHeight: 40,
    holidayDayIndices: new Set(),
    hoverConnectedPhaseIds: null,
    hoveredPhaseTaskId: null,
    isReorderMode: false,
    legacyCompactLayout: false,
    linkingFromTaskId: null,
    occupancyErrorReasons: new Map([['t', ['e']]]),
    occupancyErrorTaskIds: new Set(['t']),
    overlappingTaskIds: new Set(),
    parentStatuses: undefined,
    parentTypes: undefined,
    positionPreviews: new Map(),
    quarterlyPhaseStyle: false,
    rowFieldsVisibility: undefined,
    segmentEditTaskId: null,
    setHoveredPhaseTaskId: () => {},
    setTaskRowRef: () => () => {},
    sortableRowIds: [],
    sourceRowEndCell: null,
    sourceRowPhaseIds: null,
    sprintStartDate: new Date(),
    taskColumnWidth: 100,
    taskLinks: [],
    taskPositions: new Map(),
    taskRowHeights: new Map(),
    timelineSettings: {
      showComments: true,
      showFreeSlotPreview: true,
      showGitlab: true,
      showLinks: true,
      showReestimations: true,
      showStatuses: true,
    },
    toggleParent: () => {},
    totalParts: 30,
    visibleRows: [],
    workingDays: 10,
  } satisfies OccupancyTableBodyPropsCore;

  const minimalTaskArrows = {
    devToQaTaskId: new Map(),
    hoveredPhaseTaskId: null,
    linkingFromTaskId: null,
    segmentEditTaskId: null,
    taskIdsOrder: [] as string[],
    taskLinks: [] as Array<{ fromTaskId: string; id: string; toTaskId: string }>,
    taskPositions: new Map(),
    tasksMap: new Map(),
  };

  it('applies quarterly masking to header and body and hides arrows when showLinks is false', () => {
    const section = buildOccupancyTableSectionProps({
      bodyCore: minimalBodyCore,
      dayColumnWidth: 12,
      displayColumnCount: 10,
      handleTableClickCapture: noopTableClick,
      headerCore: minimalHeaderCore,
      quarterlyPhaseStyle: true,
      showLinks: false,
      tableScrollRef: createRef<HTMLDivElement>(),
      tableWidth: 1200,
      taskArrows: minimalTaskArrows,
      taskColumnWidth: 200,
      onDragEnd: noopDragEnd,
    });

    expect(section.headerProps.errorDayDetails.size).toBe(0);
    expect(section.bodyProps.occupancyErrorTaskIds.size).toBe(0);
    expect(section.taskArrowsProps).toBeNull();
    expect(section.onDragEnd).toBe(noopDragEnd);
    expect(section.tableWidth).toBe(1200);
  });

  it('passes task arrows through when showLinks is true', () => {
    const section = buildOccupancyTableSectionProps({
      bodyCore: minimalBodyCore,
      dayColumnWidth: 12,
      displayColumnCount: 10,
      handleTableClickCapture: noopTableClick,
      headerCore: minimalHeaderCore,
      quarterlyPhaseStyle: false,
      showLinks: true,
      tableScrollRef: createRef<HTMLDivElement>(),
      tableWidth: 800,
      taskArrows: minimalTaskArrows,
      taskColumnWidth: 200,
      onDragEnd: noopDragEnd,
    });

    expect(section.taskArrowsProps).toBe(minimalTaskArrows);
  });
});
