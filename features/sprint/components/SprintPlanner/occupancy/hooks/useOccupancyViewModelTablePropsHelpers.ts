import type { OccupancyViewProps } from '../OccupancyView.types';
import type { OccupancyViewTableSectionProps } from '../OccupancyViewTableSection';
import type { useOccupancyViewModelLocalState } from './useOccupancyViewModelStateHelpers';

import { buildOccupancyViewModelTableSectionProps } from './useOccupancyViewModelTableSectionHelpers';

type OccupancyViewModelState = ReturnType<typeof useOccupancyViewModelLocalState>;

function resolveOccupancyHoverConnectedForDim(state: OccupancyViewModelState) {
  if (!state.layout.showLinks) return null;
  if (!state.linksDimOnHover) return null;
  if (state.pipeline.linking.linkingFromTaskId != null) return null;
  return state.pipeline.hoverConnectedPhaseIds;
}

function resolveOccupancyOnStartLinking(state: OccupancyViewModelState) {
  if (!state.layout.showLinks) return undefined;
  if (state.segmentEditTaskId) return undefined;
  return state.pipeline.linking.handleStartLinking;
}

function buildOccupancyTableLinkingProps(state: OccupancyViewModelState) {
  const showLinks = state.layout.showLinks;
  return {
    hoverConnectedForDim: resolveOccupancyHoverConnectedForDim(state),
    onCancelLinking: showLinks ? state.pipeline.linking.handleCancelLinking : undefined,
    onCompleteLink: showLinks ? state.pipeline.linking.handleCompleteLink : undefined,
    onStartLinking: resolveOccupancyOnStartLinking(state),
    handleTableClickCapture: state.pipeline.linking.handleTableClickCapture,
  };
}

function buildOccupancyTablePipelineProps(
  props: OccupancyViewProps,
  state: OccupancyViewModelState
) {
  const { pipeline } = state;
  return {
    assigneeIdToTaskPositions: pipeline.assigneeIdToTaskPositions,
    availabilityDevelopersWithSegments: pipeline.occupancyData.availabilityDevelopersWithSegments,
    dayColumnWidth: pipeline.timelineDimensions.dayColumnWidth,
    developerMap: pipeline.occupancyData.developerMap,
    displayColumnCount: pipeline.displayColumnCount,
    dragAndDrop: pipeline.dragAndDrop,
    effectiveSprintStartDate: pipeline.effectiveSprintStartDate,
    goalStoryEpicNames: pipeline.goalStoryEpicNames,
    handleEmptyCellClick: pipeline.emptyCellClick.handleEmptyCellClick,
    handlePositionPreview: pipeline.positionPreview.handlePositionPreview,
    headerHeight: pipeline.timelineDimensions.headerHeight,
    holidayDayIndices: pipeline.holidayDayIndices,
    gitlabFactByLink: pipeline.gitlabFactByLink,
    linking: pipeline.linking,
    occupancyData: pipeline.occupancyData,
    overlappingTaskIds: pipeline.overlappingTaskIds,
    parentIds: pipeline.parentIds,
    parentStatuses: pipeline.parentStatuses,
    parentTypes: pipeline.parentTypes,
    positionPreviews: pipeline.positionPreview.positionPreviews,
    quarterlyWeekTimelineHeader: pipeline.quarterlyWeekTimelineHeader,
    scroll: pipeline.scroll,
    sourceRowEndCell: pipeline.sourceRowEndCell,
    sourceRowPhaseIds: pipeline.sourceRowPhaseIds,
    taskChangelogs: pipeline.taskChangelogs,
    taskChangelogsRaw: pipeline.taskChangelogsRaw,
    taskComments: pipeline.taskComments,
    taskRowHeights: pipeline.rowHeights.taskRowHeights,
    timelineDimensions: pipeline.timelineDimensions,
    timelineTotalParts: pipeline.timelineTotalParts,
    totalStoryPoints: pipeline.totals.totalStoryPoints,
    totalTestPoints: pipeline.totals.totalTestPoints,
    weekColumns: pipeline.weekColumns,
    workingDays: pipeline.workingDays,
    devToQaTaskId: pipeline.occupancyData.devToQaTaskId,
    showIssueCommentsInWeeks: pipeline.showIssueCommentsInWeeks,
    totalParts: pipeline.timelineParts.effectiveTotalParts,
  };
}

function buildOccupancyTableUiStateProps(
  props: OccupancyViewProps,
  state: OccupancyViewModelState,
  toggleParent: (parentId: string) => void,
  handleDragEnd: OccupancyViewTableSectionProps['onDragEnd']
) {
  return {
    layout: state.layout,
    collapsedParents: state.collapsedParents,
    contextMenuBlurOtherCards: state.contextMenuBlurOtherCards,
    contextMenuTaskId: state.contextMenuTaskId,
    globalNameFilter: state.globalNameFilter,
    hoveredPhaseTaskId: state.hoveredPhaseTaskId,
    isReorderMode: state.isReorderMode,
    occupancyCallbacks: props.occupancyCallbacks ?? {},
    onSegmentEditCancel: state.onSegmentEditCancel,
    ...buildOccupancyTableLinkingProps(state),
    segmentEditTaskId: state.segmentEditTaskId,
    setHoveredPhaseTaskId: state.setHoveredPhaseTaskId,
    setTaskRowRef: state.pipeline.rowHeights.setTaskRowRef,
    sprintInfos: props.sprintInfos,
    taskLinks: props.taskLinks,
    taskPositions: props.taskPositions,
    timelineSettings: props.timelineSettings,
    toggleParent,
    allExpanded: state.allExpanded,
    collapseAll: state.collapseAll,
    expandAll: state.expandAll,
    setHoveredErrorTaskId: state.setHoveredErrorTaskId,
    isResizing: state.pipeline.scroll.isResizing,
    setIsResizing: state.pipeline.scroll.setIsResizing,
    setIsReorderMode: state.setIsReorderMode,
    tasks: props.tasks,
    handleDragEnd,
  };
}

export function buildOccupancyViewModelTableSectionFromState(
  props: OccupancyViewProps,
  state: OccupancyViewModelState,
  handleDragEnd: OccupancyViewTableSectionProps['onDragEnd'],
  toggleParent: (parentId: string) => void
): OccupancyViewTableSectionProps {
  return buildOccupancyViewModelTableSectionProps({
    ...buildOccupancyTablePipelineProps(props, state),
    ...buildOccupancyTableUiStateProps(props, state, toggleParent, handleDragEnd),
  });
}
