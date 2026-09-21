import type { OccupancyViewProps } from '../OccupancyView.types';
import type { OccupancyLayoutResolved } from './useOccupancyViewModelHelpers';

import { useMemo } from 'react';

import { PARTS_PER_DAY } from '@/constants';
import { useHolidayDays } from '@/features/sprint/hooks/useHolidayDays';
import { getGoalStoryEpicNames } from '@/features/sprint/utils/goalNamesFromChecklist';
import { getOverlappingTaskIds } from '@/features/sprint/utils/occupancyValidation';
import {
  collectMergeRequestLinksFromTasks,
  useMergeRequestFacts,
} from '@/hooks/useMergeRequestFacts';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

import {
  buildAssigneeIdToTaskPositions,
  buildTaskPlanHeightSignaturesMap,
  computeHoverConnectedPhaseIds,
  computeOccupancyTaskTotals,
  computeSourceRowEndCellIndex,
  computeSourceRowPhaseIds,
} from '../occupancyViewHelpers';
import { buildQuarterlyWeekColumns, totalWeekColumnsForSprints } from '../quarterlyTimelineHeader';

import { occupancyDisplayColumnCount } from './occupancyDisplayColumnCount';
import { useOccupancyData } from './useOccupancyData';
import { useOccupancyDragAndDrop } from './useOccupancyDragAndDrop';
import { useOccupancyEmptyCellClick } from './useOccupancyEmptyCellClick';
import { useOccupancyLinkingState } from './useOccupancyLinkingState';
import { useOccupancyPositionPreview } from './useOccupancyPositionPreview';
import { useOccupancyScrollBridge } from './useOccupancyScrollBridge';
import { useOccupancyTimelineDimensions } from './useOccupancyTimelineDimensions';
import {
  computePerSprintWorkingDays,
  resolveOccupancySprintStartDate,
  resolveOccupancyTimelineParts,
  resolveOccupancyWorkingDays,
  shouldLoadOccupancyTaskChangelogs,
} from './useOccupancyViewModelHelpers';
import { useParentStatuses } from './useParentStatuses';
import { useParentTypes } from './useParentTypes';
import { useTaskChangelogs } from './useTaskChangelogs';
import { useTaskRowHeights } from './useTaskRowHeights';

function useOccupancyPipelineTimeline(
  props: OccupancyViewProps,
  layout: OccupancyLayoutResolved
) {
  const perSprintWorkingDays = computePerSprintWorkingDays(props.sprintInfos);
  const workingDays = resolveOccupancyWorkingDays(perSprintWorkingDays, props.sprintWorkingDaysCount);
  const sprintCount = props.sprintInfos?.length ? props.sprintInfos.length : 1;
  const displayColumnCount = occupancyDisplayColumnCount({
    displayAsWeeks: layout.displayAsWeeks,
    sprintInfos: props.sprintInfos,
    totalWeekColumnsForSprints,
    workingDays,
  });
  const timelineParts = resolveOccupancyTimelineParts(
    layout.cellsPerDayCount,
    workingDays,
    layout.displayAsWeeks,
    displayColumnCount
  );
  const effectiveSprintStartDate = resolveOccupancySprintStartDate(props.sprintInfos, props.sprintStartDate);
  const weekColumns =
    props.sprintInfos && layout.displayAsWeeks ? buildQuarterlyWeekColumns(props.sprintInfos) : [];
  const quarterlyWeekTimelineHeader =
    layout.quarterlyPhaseStyle && layout.displayAsWeeks && sprintCount > 1;
  const timelineTotalParts = workingDays * PARTS_PER_DAY;
  const holidayDayIndices = useHolidayDays(
    sprintCount === 1 ? props.sprintStartDate : effectiveSprintStartDate,
    workingDays
  );

  return {
    displayColumnCount,
    effectiveSprintStartDate,
    holidayDayIndices,
    quarterlyWeekTimelineHeader,
    sprintCount,
    timelineParts,
    timelineTotalParts,
    weekColumns,
    workingDays,
  };
}

function useOccupancyPipelineParentMeta(visibleRows: ReturnType<typeof useOccupancyData>['visibleRows']) {
  const parentRows = useMemo(
    () => visibleRows.filter((r): r is Extract<typeof r, { type: 'parent' }> => r.type === 'parent'),
    [visibleRows]
  );
  const parentIds = useMemo(() => parentRows.map((r) => r.id), [parentRows]);
  const parentKeys = useMemo(
    () => parentRows.map((r) => r.key).filter((k): k is string => !!k),
    [parentRows]
  );
  return { parentIds, parentKeys };
}

export function useOccupancyViewModelPipelineCore(
  props: OccupancyViewProps,
  collapsedParents: Set<string>,
  hoveredErrorTaskId: string | null,
  hoveredPhaseTaskId: string | null,
  layout: OccupancyLayoutResolved,
  globalNameFilter: string,
  occupancyCallbacksResolved: NonNullable<OccupancyViewProps['occupancyCallbacks']>
) {
  const linking = useOccupancyLinkingState({ onAddLink: occupancyCallbacksResolved.onAddLink });
  const scroll = useOccupancyScrollBridge();
  const timeline = useOccupancyPipelineTimeline(props, layout);

  const occupancyData = useOccupancyData({
    tasks: props.tasks,
    taskPositions: props.taskPositions,
    globalNameFilter,
    selectedAssigneeIds: props.selectedAssigneeIds,
    taskOrder: props.taskOrder,
    availability: props.availability,
    sprintStartDate: timeline.effectiveSprintStartDate,
    sprintWorkingDaysCount: timeline.workingDays,
    developers: props.developers,
    collapsedParents,
    flatTaskList: props.occupancyLayout?.flatTaskList,
  });

  const totals = useMemo(
    () => computeOccupancyTaskTotals(occupancyData.visibleRows, props.taskPositions),
    [occupancyData.visibleRows, props.taskPositions]
  );

  const taskPlanHeightSignatures = useMemo(
    () => buildTaskPlanHeightSignaturesMap(occupancyData.visibleRows, props.taskPositions),
    [occupancyData.visibleRows, props.taskPositions]
  );

  const occupancyLayoutKey = `${layout.legacyCompactLayout}-${layout.effectiveFactVisible}`;
  const rowHeights = useTaskRowHeights(
    occupancyData.visibleTaskIds,
    occupancyData.visibleRows.length,
    occupancyLayoutKey,
    taskPlanHeightSignatures
  );

  const allTaskIdsForChangelog = useMemo(() => props.tasks.map((t) => t.id), [props.tasks]);
  const showIssueCommentsInWeeks =
    layout.quarterlyPhaseStyle && layout.displayAsWeeks && props.timelineSettings?.showComments;
  const loadTaskChangelogs = shouldLoadOccupancyTaskChangelogs(
    layout.effectiveFactVisible,
    layout.quarterlyPhaseStyle,
    layout.displayAsWeeks,
    props.timelineSettings?.showComments
  );
  const changelogsQuery = useTaskChangelogs(loadTaskChangelogs ? allTaskIdsForChangelog : []);

  /** Спринт-планер передаёт батч; эпик/standalone — грузим здесь по всем задачам с MR. */
  const hasExternalGitlabFacts = props.gitlabFactByLink !== undefined;
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const loadGitlabFactsLocally =
    !hasExternalGitlabFacts &&
    layout.effectiveFactVisible &&
    (props.timelineSettings?.showGitlab ?? true);
  const gitlabMrLinks = useMemo(
    () => (loadGitlabFactsLocally ? collectMergeRequestLinksFromTasks(props.tasks) : []),
    [loadGitlabFactsLocally, props.tasks]
  );
  const gitlabFactsQuery = useMergeRequestFacts(
    activeOrganizationId,
    gitlabMrLinks,
    loadGitlabFactsLocally
  );
  const gitlabFactByLink = props.gitlabFactByLink ?? gitlabFactsQuery.data ?? {};

  const positionPreview = useOccupancyPositionPreview(props.taskPositions);
  const assigneeIdToTaskPositions = useMemo(
    () => buildAssigneeIdToTaskPositions(props.tasks, props.taskPositions),
    [props.tasks, props.taskPositions]
  );

  const dragAndDrop = useOccupancyDragAndDrop({
    visibleRows: occupancyData.visibleRows,
    onTaskOrderChange: occupancyCallbacksResolved.onTaskOrderChange,
  });

  const overlappingTaskIds = useMemo(() => {
    if (!hoveredErrorTaskId) return new Set<string>();
    return getOverlappingTaskIds(hoveredErrorTaskId, props.tasks, props.taskPositions);
  }, [hoveredErrorTaskId, props.tasks, props.taskPositions]);

  const hoverConnectedPhaseIds = useMemo(
    () =>
      computeHoverConnectedPhaseIds({
        devToQaTaskId: occupancyData.devToQaTaskId,
        hoveredPhaseTaskId,
        taskLinks: props.taskLinks,
        taskPositions: props.taskPositions,
        tasks: props.tasks,
      }),
    [hoveredPhaseTaskId, props.taskLinks, props.taskPositions, occupancyData.devToQaTaskId, props.tasks]
  );

  const sourceRowPhaseIds = useMemo(
    () =>
      computeSourceRowPhaseIds({
        devToQaTaskId: occupancyData.devToQaTaskId,
        linkingFromTaskId: linking.linkingFromTaskId,
        tasks: props.tasks,
      }),
    [linking.linkingFromTaskId, props.tasks, occupancyData.devToQaTaskId]
  );

  const sourceRowEndCell = useMemo(
    () =>
      computeSourceRowEndCellIndex({
        cellsPerDay: layout.cellsPerDayCount,
        sourceRowPhaseIds,
        taskPositions: props.taskPositions,
      }),
    [sourceRowPhaseIds, props.taskPositions, layout.cellsPerDayCount]
  );

  const emptyCellClick = useOccupancyEmptyCellClick({
    developers: props.developers,
    onOpenAssigneePicker: occupancyCallbacksResolved.onOpenAssigneePicker,
    onPositionSave: occupancyCallbacksResolved.onPositionSave,
  });

  const timelineDimensions = useOccupancyTimelineDimensions({
    displayAsWeeks: layout.displayAsWeeks,
    displayColumnCount: timeline.displayColumnCount,
    plannerSidebarOpen: layout.plannerSidebarOpen,
    plannerSidebarWidth: layout.plannerSidebarWidth,
    quarterlyPhaseStyle: layout.quarterlyPhaseStyle,
    quarterlyWeekTimelineHeader: timeline.quarterlyWeekTimelineHeader,
    sprintCount: timeline.sprintCount,
    statusColumnWidth: layout.statusColumnWidth,
    tableScrollRef: scroll.tableScrollRef,
    taskColumnWidth: scroll.taskColumnWidth,
    timelineScale: layout.timelineScale,
    workingDays: timeline.workingDays,
  });

  const { parentIds, parentKeys } = useOccupancyPipelineParentMeta(occupancyData.visibleRows);
  const parentStatusesQuery = useParentStatuses(parentKeys);
  const parentTypesQuery = useParentTypes(parentKeys);

  const goalStoryEpicNames = useMemo(
    () =>
      getGoalStoryEpicNames([
        ...(props.deliveryChecklistItems ?? []),
        ...(props.discoveryChecklistItems ?? []),
      ]),
    [props.deliveryChecklistItems, props.discoveryChecklistItems]
  );

  return {
    assigneeIdToTaskPositions,
    displayColumnCount: timeline.displayColumnCount,
    dragAndDrop,
    effectiveSprintStartDate: timeline.effectiveSprintStartDate,
    emptyCellClick,
    goalStoryEpicNames,
    holidayDayIndices: timeline.holidayDayIndices,
    hoverConnectedPhaseIds,
    gitlabFactByLink,
    linking,
    occupancyData,
    overlappingTaskIds,
    parentIds,
    parentStatuses: parentStatusesQuery.data,
    parentTypes: parentTypesQuery.data,
    positionPreview,
    quarterlyWeekTimelineHeader: timeline.quarterlyWeekTimelineHeader,
    rowHeights,
    scroll,
    showIssueCommentsInWeeks,
    sourceRowEndCell,
    sourceRowPhaseIds,
    taskChangelogs: changelogsQuery.data?.durations ?? new Map(),
    taskChangelogsRaw: changelogsQuery.data?.changelogs ?? new Map(),
    taskComments: changelogsQuery.data?.comments ?? new Map(),
    timelineDimensions,
    timelineParts: timeline.timelineParts,
    timelineTotalParts: timeline.timelineTotalParts,
    totals,
    weekColumns: timeline.weekColumns,
    workingDays: timeline.workingDays,
  };
}
