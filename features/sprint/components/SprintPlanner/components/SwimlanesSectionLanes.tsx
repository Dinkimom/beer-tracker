import type { SwimlanesSectionProps } from './SwimlanesSection.types';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { Comment, Developer, Task, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Xwrapper } from 'react-xarrows';

import { ZIndex } from '@/constants';
import { SwimlanePinnedArrowSync } from '@/features/sprint/components/SprintPlanner/components/SwimlanePinnedArrowSync';
import { FeatureLaneAddRow } from '@/features/sprint/components/SprintPlanner/feature-lanes/FeatureLaneAddRow';
import {
  applyPinnedSwimlaneFrameTops,
  partitionPinnedSwimlaneRows,
  syncPinnedSwimlaneFrames,
  togglePinnedSwimlaneRowId,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionHelpers';
import {
  buildSwimlaneLaneData,
  resolveSwimlaneActiveTask,
  type SwimlaneLaneData,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionSwimlanePropsHelpers';
import { Swimlane } from '@/features/swimlane/components/Swimlane';
import { TaskArrows } from '@/features/swimlane/components/task-arrows';
import { PlanPatchScheduleArrows } from '@/features/swimlane/components/task-arrows/PlanPatchScheduleArrows';
import { PlanPatchSegmentArrows } from '@/features/swimlane/components/task-arrows/PlanPatchSegmentArrows';
import { SwimlaneXarrowRedrawProvider } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import {
  SwimlaneBoardContext,
  SwimlaneHighlightProvider,
  type SwimlaneHighlight,
} from '@/features/swimlane/SwimlaneBoardContext';
import {
  useSwimlaneLinksIdleModeStorage,
  useSwimlanePinnedRowIdsStorage,
} from '@/hooks/useLocalStorage';
import { taskLinksForOnboardingArrows } from '@/lib/plannerOnboarding/onboardingDemoLane';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { useSwimlaneBoardValue } from '../hooks/useSwimlaneBoardValue';

const EMPTY_TASKS: Task[] = [];
const EMPTY_FACT_SEGMENTS: SwimlaneInProgressFactSegment[] = [];

function useStableElementRefMap() {
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const callbacks = useRef(new Map<string, (node: HTMLDivElement | null) => void>());
  const refFor = useCallback((id: string) => {
    const cached = callbacks.current.get(id);
    if (cached) return cached;
    const callback = (node: HTMLDivElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    };
    callbacks.current.set(id, callback);
    return callback;
  }, []);
  return { nodes, refFor };
}

function usePinnedSwimlaneFrameTops(
  pinnedIdKey: string,
  frameNodes: { readonly current: Map<string, HTMLDivElement> },
  onLaidOutRef: { readonly current: (() => void) | null }
) {
  useLayoutEffect(() => {
    const pinnedIds = JSON.parse(pinnedIdKey) as string[];
    const pinnedFrames = syncPinnedSwimlaneFrames(frameNodes.current, pinnedIds);
    if (pinnedFrames.length > 0) onLaidOutRef.current?.();
    if (pinnedFrames.length === 0) return undefined;
    const observer = new ResizeObserver(() => {
      applyPinnedSwimlaneFrameTops(pinnedFrames);
      onLaidOutRef.current?.();
    });
    for (const frame of pinnedFrames) observer.observe(frame);
    return () => observer.disconnect();
  }, [frameNodes, onLaidOutRef, pinnedIdKey]);
}

interface SwimlanesSectionLanesProps {
  /** Входы контекста доски — разбираются по полям в `useSwimlaneBoardValue`. */
  boardInputs: Omit<Parameters<typeof useSwimlaneBoardValue>[0], 'section' | 'showLinks'>;
  comments: Comment[];
  developerAvailabilityMap: Map<string, { boardEvents: BoardAvailabilityEvent[] }>;
  /** Наведение как есть; кластер связей дорожки приглушают только при включённых связях. */
  hover: SwimlaneHighlight;
  linkingFromTaskId: string | null;
  linkingSessionActive: boolean;
  /** Капсула «Связь» в тулбаре — крестики удаления не показываем. */
  linkToolArmed?: boolean;
  section: SwimlanesSectionProps;
  segmentEditTaskId: string | null;
  swimlaneInProgressFactSegmentsByDev: Map<string, SwimlaneInProgressFactSegment[]>;
  swimlanePositions: Map<string, TaskPosition>;
  swimlaneRows: Developer[];
  visibleSwimlaneAssigneeIds: Set<string>;
  onTaskHoverEnd: () => void;
}

export function SwimlanesSectionLanes({
  boardInputs,
  hover,
  comments,
  developerAvailabilityMap,
  linkToolArmed = false,
  linkingFromTaskId,
  linkingSessionActive,
  section,
  segmentEditTaskId,
  swimlaneInProgressFactSegmentsByDev,
  swimlanePositions,
  swimlaneRows,
  visibleSwimlaneAssigneeIds,
  onTaskHoverEnd,
}: SwimlanesSectionLanesProps) {
  const { cardShadowTaskId, factHoveredTaskId, hoverConnectedTaskIds, hoveredTaskId } = hover;
  const [pinnedRowIds, setPinnedRowIds] = useSwimlanePinnedRowIdsStorage();
  const { pinned: pinnedRows, unpinned: unpinnedRows } = useMemo(
    () => partitionPinnedSwimlaneRows(swimlaneRows, pinnedRowIds),
    [pinnedRowIds, swimlaneRows]
  );
  const orderedRows = useMemo(
    () => [...pinnedRows, ...unpinnedRows],
    [pinnedRows, unpinnedRows]
  );
  const pinnedIdKey = JSON.stringify(pinnedRows.map((row) => row.id));
  const rowsLayoutKey = `${pinnedIdKey}|${orderedRows.map((row) => row.id).join('|')}`;
  const { nodes: frameNodes, refFor: frameRefFor } = useStableElementRefMap();
  const pinnedFrameArrowRedrawRef = useRef<(() => void) | null>(null);
  usePinnedSwimlaneFrameTops(pinnedIdKey, frameNodes, pinnedFrameArrowRedrawRef);
  const pinnedIdSet = useMemo(() => new Set(pinnedRowIds), [pinnedRowIds]);
  const togglePinnedRow = useCallback(
    (assigneeId: string) => {
      setPinnedRowIds((prev) => togglePinnedSwimlaneRowId(prev, assigneeId));
    },
    [setPinnedRowIds]
  );

  const showLinks = section.display.linksVisible;
  const linksDimOnHover = section.display.linksDimOnHover;
  const [linksIdleMode] = useSwimlaneLinksIdleModeStorage();
  const arrowTaskLinks = taskLinksForOnboardingArrows(showLinks, section.filteredTaskLinks);

  // Данные дорожек пересобираются только при смене данных доски, не на наведение и drag.
  const imagesVisible = section.display.imagesVisible;
  const notesVisible = section.display.notesVisible;
  const laneDataById = useMemo(() => {
    const annotationLayers = { imagesVisible, notesVisible };
    const map = new Map<string, SwimlaneLaneData>();
    for (const developer of swimlaneRows) {
      map.set(developer.id, buildSwimlaneLaneData({
        annotationLayers,
        comments,
        commentsVisible: section.display.commentsVisible,
        developerId: developer.id,
        taskPositions: section.taskPositions,
        tasks: section.tasksByAssignee.get(developer.id) ?? EMPTY_TASKS,
        tasksMap: section.tasksMap,
      }));
    }
    return map;
  }, [
    comments,
    imagesVisible,
    notesVisible,
    section.display.commentsVisible,
    section.taskPositions,
    section.tasksByAssignee,
    section.tasksMap,
    swimlaneRows,
  ]);

  const board = useSwimlaneBoardValue({ ...boardInputs, section, showLinks });

  const activeTask = resolveSwimlaneActiveTask(
    section.dragAndDrop.activeTaskId,
    section.allTasksForDrag
  );
  const laneHoverConnectedTaskIds =
    showLinks && linksDimOnHover && !linkingSessionActive ? hoverConnectedTaskIds : null;
  const highlight = useMemo<SwimlaneHighlight>(
    () => ({
      cardShadowTaskId,
      factHoveredTaskId,
      hoverConnectedTaskIds: laneHoverConnectedTaskIds,
      hoveredTaskId,
    }),
    [
      cardShadowTaskId,
      factHoveredTaskId,
      hoveredTaskId,
      laneHoverConnectedTaskIds,
    ]
  );
  const swimlaneFactTimelineEnabled = section.display.factTimelineEnabled;

  const showArrows = showLinks || arrowTaskLinks.length > 0;
  const taskArrowProps = {
    activeTaskId: section.dragAndDrop.activeTaskId,
    hoveredTaskId,
    idleMode: linksIdleMode,
    linkToolArmed,
    linkingFromTaskId,
    linkingSessionActive,
    rowsLayoutKey,
    segmentEditTaskId,
    taskLinks: arrowTaskLinks,
    taskPositions: swimlanePositions,
    tasks: section.allTasksForDrag,
    visibleDeveloperIds: visibleSwimlaneAssigneeIds,
    onDeleteLink: section.onDeleteLink,
    onTaskHoverEnd,
  };

  const renderLane = (developer: Developer) => {
    const laneData = laneDataById.get(developer.id);
    if (!laneData) return null;
    const isPinned = pinnedIdSet.has(developer.id);
    const isTeamLane = isTeamSwimlaneAssigneeId(developer.id);
    return (
      <div
        key={developer.id}
        ref={frameRefFor(developer.id)}
        className={isPinned ? 'sticky planner-pinned-lane' : undefined}
        style={isPinned ? { zIndex: ZIndex.stickyPinnedRows } : undefined}
      >
        <Swimlane
          {...laneData}
          activeDraggableId={section.dragAndDrop.activeDraggableId}
          activeTask={activeTask}
          activeTaskDuration={section.dragAndDrop.activeTaskDuration}
          developer={developer}
          developerAvailability={isTeamLane ? undefined : developerAvailabilityMap.get(developer.id)}
          isDraggingTask={section.dragAndDrop.isDraggingTask}
          isPinned={isPinned}
          linkingFromTaskId={showLinks ? linkingFromTaskId : null}
          segmentEditTaskId={segmentEditTaskId}
          swimlaneFactTimelineEnabled={!isTeamLane && swimlaneFactTimelineEnabled}
          swimlaneInProgressDurations={
            isTeamLane
              ? EMPTY_FACT_SEGMENTS
              : (swimlaneInProgressFactSegmentsByDev.get(developer.id) ?? EMPTY_FACT_SEGMENTS)
          }
          onTogglePin={togglePinnedRow}
        />
        {isPinned && showArrows ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            data-swimlane-arrow-clip
            style={{ zIndex: ZIndex.contentOverlay }}
          >
            {/*
              Копия только связей этой строки: общий слой лежит под sticky z-index
              и не виден между карточками; чужие линии при скролле не рисуем поверх стекла.
            */}
            <TaskArrows
              {...taskArrowProps}
              clipToAssigneeId={developer.id}
              clipToRow
            />
            <PlanPatchScheduleArrows clipToAssigneeId={developer.id} />
            <PlanPatchSegmentArrows clipToAssigneeId={developer.id} />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Xwrapper>
      <SwimlaneXarrowRedrawProvider>
        <SwimlaneBoardContext.Provider value={board}>
        <SwimlaneHighlightProvider value={highlight}>
        <SwimlanePinnedArrowSync
          active={pinnedRows.length > 0}
          redrawRef={pinnedFrameArrowRedrawRef}
        />
        <div className="relative" data-planner-pattern-origin="">
          {orderedRows.map(renderLane)}
          <FeatureLaneAddRow participantsColumnWidth={section.participantsColumnWidth} />
        </div>
        {showArrows ? <TaskArrows {...taskArrowProps} /> : null}
        <PlanPatchScheduleArrows />
        <PlanPatchSegmentArrows />
        </SwimlaneHighlightProvider>
        </SwimlaneBoardContext.Provider>
      </SwimlaneXarrowRedrawProvider>
    </Xwrapper>
  );
}
