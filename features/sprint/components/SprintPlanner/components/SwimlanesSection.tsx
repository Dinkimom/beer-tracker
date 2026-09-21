'use client';

/**
 * Компонент секции со свимлейнами
 * Отвечает за отображение DaysHeader, Swimlanes и TaskArrows
 */

import type { SwimlanesSectionProps } from './SwimlanesSection.types';

import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { WORKING_DAYS } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  sprintPlannerContentRowWidthCss,
  sprintPlannerDaysHeaderContentWidthCss,
} from '@/features/sprint/components/SprintPlanner/layout/sprintPlannerSwimlaneLayoutWidths';
import { SprintPlannerTimelineFill } from '@/features/sprint/components/SprintPlanner/layout/SprintPlannerTimelineFill';
import { resolvePlacementToolbarScrollPadPx } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import {
  buildDeveloperAvailabilityMap,
  computeHoverConnectedTaskIds,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionHelpers';
import { mergeSwimlanePositionsWithVisibleComments } from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionSwimlanePropsHelpers';
import { useHolidayDays } from '@/features/sprint/hooks/useHolidayDays';
import { useSwimlaneCalendarBusyByDeveloper } from '@/features/sprint/hooks/useSwimlaneCalendarBusy';
import { buildAssigneeUnavailableDays, getOccupancyErrorDays, getOccupancyErrorDetailsByDay, getOccupancyErrorReasons, getOccupancyErrorTaskIds } from '@/features/sprint/utils/occupancyValidation';
import {
  buildSwimlaneInProgressFactSegmentsForAssignee,
  type SwimlaneInProgressFactSegment,
} from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import { isSwimlaneLinkingSessionActive } from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { useRootStore } from '@/lib/layers';
import {
  createTeamSwimlaneDeveloper,
  isTeamSwimlaneRowHidden,
} from '@/lib/swimlane/teamSwimlaneAssignee';

import { DaysHeader } from '../../DaysHeader';
import { useSwimlaneLinkingHandlers } from '../hooks/useSwimlaneLinkingHandlers';

import { ParticipantsColumnResizeHandle } from './ParticipantsColumnResizeHandle';
import { SwimlanesSectionLanes } from './SwimlanesSectionLanes';

export const SwimlanesSection = observer(function SwimlanesSection(props: SwimlanesSectionProps) {
  const {
    allTasksForDrag,
    boardAvailabilityEvents,
    boardId,
    comments,
    commentsVisible,
    developers,
    developersManagement,
    hideTeamLane = false,
    occupancyValidationPositions,
    dragAndDrop,
    filteredTaskLinks,
    participantsColumnWidth,
    qaTasksMap,
    removeParticipantFromTeam,
    scrollContainerRef,
    showLinks = true,
    sidebarOpen,
    sidebarWidth,
    sprintStartDate,
    sprintTimelineWorkingDays = WORKING_DAYS,
    swimlaneCalendarBusyEnabled = false,
    swimlaneFactTimelineEnabled = false,
    swimlaneImagesVisible = true,
    swimlaneNotesVisible = true,
    taskDurationsByTaskId,
    taskPositions,
    tasksMap,
    viewMode,
    onAddLink,
    onParticipantsColumnWidthChange,
    onTaskClick,
  } = props;
  const { sprintPlannerUi } = useRootStore();
  const { t } = useI18n();
  const contextMenuTaskId = sprintPlannerUi.contextMenuTaskId;
  const globalNameFilter = sprintPlannerUi.globalNameFilter;
  const hoveredTaskId = sprintPlannerUi.hoveredTaskId;
  const linkingFromTaskId = sprintPlannerUi.linkingFromTaskId;
  const linkToolArmed = sprintPlannerUi.placementTool === 'link';
  const linkingSessionActive = isSwimlaneLinkingSessionActive(
    linkingFromTaskId,
    linkToolArmed
  );
  const segmentEditTaskId = sprintPlannerUi.segmentEditTaskId;

  const [factHoveredTaskId, setFactHoveredTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!swimlaneFactTimelineEnabled) {
      setFactHoveredTaskId(null);
    }
  }, [swimlaneFactTimelineEnabled]);

  useEffect(() => {
    if (dragAndDrop.isDraggingTask) {
      setFactHoveredTaskId(null);
    }
  }, [dragAndDrop.isDraggingTask]);

  const holidayDayIndices = useHolidayDays(sprintStartDate, sprintTimelineWorkingDays);

  const calendarBusyByDeveloper = useSwimlaneCalendarBusyByDeveloper({
    developers: developersManagement.visibleDevelopers.map((d) => ({
      email: d.email,
      id: d.id,
    })),
    enabled:
      swimlaneCalendarBusyEnabled && (viewMode === 'full' || viewMode === 'compact'),
    sprintStartDate,
    sprintTimelineWorkingDays,
  });

  const swimlaneFactDeveloperMap = useMemo(
    () => new Map(developers.map((d) => [d.id, d] as const)),
    [developers]
  );

  const assigneeUnavailableDays = useMemo(
    () =>
      buildAssigneeUnavailableDays(boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays),
    [boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays]
  );

  const validationPositions = occupancyValidationPositions ?? taskPositions;
  const occupancyErrorTaskIds = useMemo(
    () => getOccupancyErrorTaskIds(allTasksForDrag, validationPositions, assigneeUnavailableDays),
    [allTasksForDrag, validationPositions, assigneeUnavailableDays]
  );
  const occupancyErrorDays = useMemo(
    () => getOccupancyErrorDays(allTasksForDrag, validationPositions, assigneeUnavailableDays),
    [allTasksForDrag, validationPositions, assigneeUnavailableDays]
  );
  const occupancyErrorReasons = useMemo(
    () => getOccupancyErrorReasons(allTasksForDrag, validationPositions, assigneeUnavailableDays),
    [allTasksForDrag, validationPositions, assigneeUnavailableDays]
  );
  const occupancyErrorDetailsByDay = useMemo(
    () => getOccupancyErrorDetailsByDay(allTasksForDrag, validationPositions, assigneeUnavailableDays),
    [allTasksForDrag, validationPositions, assigneeUnavailableDays]
  );

  const swimlaneInProgressFactSegmentsByDev = useMemo(() => {
    const map = new Map<string, SwimlaneInProgressFactSegment[]>();
    if (!swimlaneFactTimelineEnabled || !taskDurationsByTaskId?.size) {
      return map;
    }
    for (const dev of developersManagement.visibleDevelopers) {
      map.set(
        dev.id,
        buildSwimlaneInProgressFactSegmentsForAssignee(
          dev.id,
          dev.role,
          taskPositions,
          taskDurationsByTaskId,
          tasksMap
        )
      );
    }
    return map;
  }, [
    swimlaneFactTimelineEnabled,
    taskDurationsByTaskId,
    taskPositions,
    tasksMap,
    developersManagement.visibleDevelopers,
  ]);

  const developerAvailabilityMap = useMemo(
    () => buildDeveloperAvailabilityMap(boardAvailabilityEvents, developers),
    [boardAvailabilityEvents, developers]
  );

  const swimlaneRows = useMemo(() => {
    const participantRows = developersManagement.visibleDevelopers;
    if (
      hideTeamLane ||
      !commentsVisible ||
      isTeamSwimlaneRowHidden(developersManagement.hiddenIds)
    ) {
      return participantRows;
    }
    return [
      createTeamSwimlaneDeveloper(t('sprintPlanner.swimlane.teamLane.name')),
      ...participantRows,
    ];
  }, [
    commentsVisible,
    developersManagement.hiddenIds,
    developersManagement.visibleDevelopers,
    hideTeamLane,
    t,
  ]);

  const visibleSwimlaneAssigneeIds = useMemo(
    () => new Set(swimlaneRows.map((row) => row.id)),
    [swimlaneRows]
  );

  // Не мемоизировать по ссылке Map: positions мутирует на месте (MobX), снимок иначе залипает пустым.
  const swimlanePositions = mergeSwimlanePositionsWithVisibleComments({
    comments,
    commentsVisible,
    swimlaneImagesVisible,
    swimlaneNotesVisible,
    taskPositions,
  });

  /** Кластер связей при hover: все входящие позади + одна исходящая вперёд. Несвязанные затемняются только если в кластере >1 задачи. */
  const hoverConnectedTaskIds = useMemo(
    () => computeHoverConnectedTaskIds(hoveredTaskId, filteredTaskLinks, qaTasksMap, swimlanePositions),
    [hoveredTaskId, filteredTaskLinks, qaTasksMap, swimlanePositions]
  );

  const handleTaskHover = useCallback(
    (taskId: string | null) => {
      if (dragAndDrop.isDraggingTask || taskId == null) {
        sprintPlannerUi.setHoveredTaskId(null);
        return;
      }
      sprintPlannerUi.setHoveredTaskId(taskId);
    },
    [dragAndDrop.isDraggingTask, sprintPlannerUi]
  );

  const {
    handleSwimlanesClickCapture,
    handleTaskClickWithLinking,
    sourceLinkEndCell,
  } = useSwimlaneLinkingHandlers({
    linkToolArmed,
    linkingFromTaskId,
    onAddLink,
    onTaskClick,
    setLinkingFromTaskId: sprintPlannerUi.setLinkingFromTaskId,
    showLinks,
    taskLinks: filteredTaskLinks,
    taskPositions: swimlanePositions,
  });

  const effectiveFactHoveredTaskId =
    linkingSessionActive || dragAndDrop.isDraggingTask ? null : factHoveredTaskId;

  const effectiveHoverConnectedTaskIds =
    linkingSessionActive || dragAndDrop.isDraggingTask ? null : hoverConnectedTaskIds;

  const sidebarEffectiveWidthPx = sidebarOpen ? sidebarWidth : 0;
  const swimlanesContentWidth = sprintPlannerDaysHeaderContentWidthCss(
    viewMode,
    participantsColumnWidth,
    sidebarEffectiveWidthPx,
    sprintTimelineWorkingDays
  );
  const swimlanesRowWidth = sprintPlannerContentRowWidthCss(
    viewMode,
    participantsColumnWidth,
    sidebarEffectiveWidthPx,
    sprintTimelineWorkingDays
  );
  const showAfterSprintRail = viewMode === 'full';

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-y-auto min-h-0 ${viewMode === 'full' ? 'overflow-x-auto' : 'overflow-x-hidden'} scrollbar-thin-custom scrollbar-gutter-stable`}
      style={sidebarOpen
        ? { flex: 1, minWidth: 0, transition: 'none' }
        : { flex: 1, transition: 'none' }
      }
      onClickCapture={handleSwimlanesClickCapture}
    >
      {/* min-h-full: при коротком списке участников футер добирает высоту до viewport */}
      <div
        className="relative flex min-h-full flex-col"
        style={{
          width: swimlanesRowWidth,
          minWidth: swimlanesRowWidth,
        }}
      >
        {onParticipantsColumnWidthChange ? (
          <ParticipantsColumnResizeHandle
            columnWidth={participantsColumnWidth}
            scrollContainerRef={scrollContainerRef}
            onWidthChange={onParticipantsColumnWidthChange}
          />
        ) : null}
        {/* DaysHeader: sticky top внутри этого flex-col (высота = весь контент скролла) */}
        <DaysHeader
          boardId={boardId}
          developers={developers}
          developersManagement={developersManagement}
          errorDayDetails={occupancyErrorDetailsByDay}
          errorDayIndices={occupancyErrorDays}
          holidayDayIndices={holidayDayIndices}
          participantsColumnWidth={participantsColumnWidth}
          removeParticipantFromTeam={removeParticipantFromTeam}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
          sprintStartDate={sprintStartDate}
          sprintTimelineWorkingDays={sprintTimelineWorkingDays}
          viewMode={viewMode}
        />

        {/* Строка: таймлайн + зона после спринта; flex-1 — на оставшуюся высоту */}
        <div
          className="relative flex min-h-0 flex-1"
          data-planner-swimlanes-row
          style={{ transition: 'none', zIndex: 0 }}
        >
          <div
            className="relative flex shrink-0 flex-col bg-white dark:bg-gray-800"
            data-planner-swimlanes-content
            style={{
              width: swimlanesContentWidth,
              minWidth: swimlanesContentWidth,
              transition: 'none',
            }}
          >
            <div className="shrink-0" data-planner-swimlanes-lanes>
              <SwimlanesSectionLanes
                calendarBusyByDeveloper={calendarBusyByDeveloper}
                comments={comments}
                contextMenuTaskId={contextMenuTaskId}
                developerAvailabilityMap={developerAvailabilityMap}
                effectiveFactHoveredTaskId={effectiveFactHoveredTaskId}
                errorReasons={occupancyErrorReasons}
                errorTaskIds={occupancyErrorTaskIds}
                globalNameFilter={globalNameFilter}
                holidayDayIndices={holidayDayIndices}
                hoverConnectedTaskIds={effectiveHoverConnectedTaskIds}
                hoveredTaskId={hoveredTaskId}
                linkToolArmed={linkToolArmed}
                linkingFromTaskId={linkingFromTaskId}
                linkingSessionActive={linkingSessionActive}
                section={props}
                segmentEditTaskId={segmentEditTaskId}
                sourceLinkEndCell={sourceLinkEndCell}
                swimlaneFactDeveloperMap={swimlaneFactDeveloperMap}
                swimlaneInProgressFactSegmentsByDev={swimlaneInProgressFactSegmentsByDev}
                swimlanePositions={swimlanePositions}
                swimlaneRows={swimlaneRows}
                visibleSwimlaneAssigneeIds={visibleSwimlaneAssigneeIds}
                onFactSegmentHover={
                  dragAndDrop.isDraggingTask ? () => undefined : setFactHoveredTaskId
                }
                onSegmentEditCancel={() => sprintPlannerUi.setSegmentEditTaskId(null)}
                onTaskClick={handleTaskClickWithLinking}
                onTaskHover={handleTaskHover}
                onTaskHoverEnd={() => handleTaskHover(null)}
              />
            </div>
            <div
              aria-hidden
              className="flex-1 bg-white dark:bg-gray-800"
              style={{
                minHeight: resolvePlacementToolbarScrollPadPx(
                  comments.some((comment) => comment.pendingApproval === true)
                ),
              }}
            />
          </div>
          {showAfterSprintRail ? (
            <SprintPlannerTimelineFill className="min-w-0 flex-1 self-stretch border-l border-gray-200 dark:border-gray-600" />
          ) : null}
        </div>
      </div>
    </div>
  );
});
