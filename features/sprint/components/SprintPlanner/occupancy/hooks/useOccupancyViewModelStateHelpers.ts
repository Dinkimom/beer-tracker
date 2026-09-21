import type { OccupancyViewProps } from '../OccupancyView.types';

import { useCallback, useEffect, useState } from 'react';

import { useRootStore } from '@/lib/layers';

import { resolveOccupancyPlannerUiState } from '../occupancyPlannerUiResolve';

import {
  areAllParentsExpanded,
  resolveOccupancyLayoutSettings,
  resolveOccupancyOnSegmentEditCancel,
} from './useOccupancyViewModelHelpers';
import { useOccupancyViewModelPipeline } from './useOccupancyViewModelPipeline';

export function useOccupancyViewModelLocalState(props: OccupancyViewProps) {
  const { sprintPlannerUi } = useRootStore();
  const {
    occupancyCallbacks = {},
    occupancyLayout = {},
    contextMenuBlurOtherCards = false,
    contextMenuTaskId: contextMenuTaskIdProp = null,
    factVisible,
    globalNameFilter: globalNameFilterProp = '',
    linksDimOnHover = true,
    segmentEditTaskId: segmentEditTaskIdProp = null,
    swimlaneLinksVisible = true,
    timelineSettings,
    usePlannerUiStore = false,
  } = props;

  const { contextMenuTaskId, globalNameFilter, segmentEditTaskId } =
    resolveOccupancyPlannerUiState(usePlannerUiStore, sprintPlannerUi, {
      contextMenuTaskId: contextMenuTaskIdProp,
      globalNameFilter: globalNameFilterProp,
      segmentEditTaskId: segmentEditTaskIdProp,
    });

  const layout = resolveOccupancyLayoutSettings(
    occupancyLayout,
    timelineSettings ?? {
      showComments: true,
      showFreeSlotPreview: true,
      showGitlab: true,
      showLinks: true,
      showReestimations: true,
      showStatuses: true,
    },
    swimlaneLinksVisible,
    factVisible
  );

  const onSegmentEditCancel = resolveOccupancyOnSegmentEditCancel(
    usePlannerUiStore,
    sprintPlannerUi.setSegmentEditTaskId.bind(sprintPlannerUi),
    occupancyCallbacks.onSegmentEditCancel
  );

  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hoveredErrorTaskId, setHoveredErrorTaskId] = useState<string | null>(null);
  const [hoveredPhaseTaskId, setHoveredPhaseTaskIdState] = useState<string | null>(null);
  const setHoveredPhaseTaskId = useCallback(
    (taskId: string | null) => {
      setHoveredPhaseTaskIdState(taskId);
      if (usePlannerUiStore) {
        sprintPlannerUi.setHoveredTaskId(taskId);
      }
    },
    [sprintPlannerUi, usePlannerUiStore]
  );

  useEffect(() => {
    if (!usePlannerUiStore) {
      return undefined;
    }
    return () => {
      if (sprintPlannerUi.hoveredTaskId === hoveredPhaseTaskId) {
        sprintPlannerUi.setHoveredTaskId(null);
      }
    };
  }, [hoveredPhaseTaskId, sprintPlannerUi, usePlannerUiStore]);

  const pipeline = useOccupancyViewModelPipeline(
    props,
    collapsedParents,
    hoveredErrorTaskId,
    hoveredPhaseTaskId,
    isReorderMode,
    layout,
    globalNameFilter,
    occupancyCallbacks
  );

  const allExpanded = areAllParentsExpanded(pipeline.parentIds, collapsedParents);
  const expandAll = useCallback(() => setCollapsedParents(new Set()), []);
  const collapseAll = useCallback(
    () => setCollapsedParents(new Set(pipeline.parentIds)),
    [pipeline.parentIds]
  );

  return {
    allExpanded,
    collapsedParents,
    collapseAll,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    expandAll,
    globalNameFilter,
    hoveredErrorTaskId,
    hoveredPhaseTaskId,
    isReorderMode,
    layout,
    linksDimOnHover,
    onSegmentEditCancel,
    pipeline,
    segmentEditTaskId,
    setCollapsedParents,
    setHoveredErrorTaskId,
    setHoveredPhaseTaskId,
    setIsReorderMode,
  };
}
