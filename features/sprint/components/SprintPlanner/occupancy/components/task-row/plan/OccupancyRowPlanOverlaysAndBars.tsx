'use client';

import type { TimelineSettings } from '../../table/OccupancyTableHeader';
import type { PositionPreview } from './OccupancyPhaseBar';
import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { Developer, TaskPosition } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { OccupancyBaselineBar } from './OccupancyBaselineBar';
import { OccupancyDevPhaseBars } from './OccupancyDevPhaseBars';
import { OccupancyQaPhaseBars } from './OccupancyQaPhaseBars';
import { OccupancyAddPhaseGhost } from './overlays/OccupancyAddPhaseGhost';
import { OccupancyLinkBlockOutline } from './overlays/OccupancyLinkBlockOutline';
import { OccupancyPhaseHoverZone } from './overlays/OccupancyPhaseHoverZone';
import { OccupancyRedGhosts } from './overlays/OccupancyRedGhosts';

interface OccupancyRowPlanOverlaysAndBarsProps extends OccupancyPlanPhaseBarsProps {
  assignee?: Developer;
  assigneeOtherPositions: TaskPosition[];
  factChangelog: ChangelogEntry[];
  factChangelogs: Map<string, ChangelogEntry[]>;
  holidayDayIndices?: Set<number>;
  hoveredCell: { taskId: string; dayIndex: number; partIndex: number } | null;
  hoveredPhaseTaskId?: string | null;
  positionPreviews: Map<string, PositionPreview>;
  qaAssigneeOtherPositions: TaskPosition[];
  sprintStartDate: Date;
  timelineSettings: TimelineSettings;
}

export function OccupancyRowPlanOverlaysAndBars({
  assignee,
  assigneeOtherPositions,
  factChangelog,
  factChangelogs,
  holidayDayIndices,
  hoveredCell,
  hoveredPhaseTaskId,
  qaAssigneeOtherPositions,
  setHoveredPhaseTaskId,
  sprintStartDate,
  ...planPhaseBarsProps
}: OccupancyRowPlanOverlaysAndBarsProps) {
  const {
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    totalParts,
    task,
    qaTask,
    qaPosition,
    qaAssignee,
    qaPositionAssignee,
    position,
    positionPreviews,
    timelineSettings,
  } = planPhaseBarsProps;
  const qaDeveloperForAvatar = qaPositionAssignee ?? qaAssignee;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <OccupancyAddPhaseGhost
        assignee={assignee}
        hoveredCell={hoveredCell}
        isDraggingDev={positionPreviews.has(task.id)}
        isLinking={planPhaseBarsProps.linkingFromTaskId != null}
        phaseBarHeightPx={phaseBarHeightPx}
        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
        position={position}
        qaAssignee={qaDeveloperForAvatar}
        qaPosition={qaPosition}
        qaTask={qaTask}
        task={task}
        totalParts={totalParts}
      />
      <OccupancyRedGhosts
        assigneeOtherPositions={assigneeOtherPositions}
        holidayDayIndices={holidayDayIndices}
        hoveredCell={hoveredCell}
        isLinking={planPhaseBarsProps.linkingFromTaskId != null}
        phaseBarHeightPx={phaseBarHeightPx}
        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
        position={position}
        positionPreviews={positionPreviews}
        qaAssigneeOtherPositions={qaAssigneeOtherPositions}
        qaPosition={qaPosition}
        qaTask={qaTask}
        task={task}
        timelineSettings={timelineSettings}
        totalParts={totalParts}
      />
      <OccupancyPhaseHoverZone
        phaseBarHeightPx={phaseBarHeightPx}
        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
        position={position}
        qaPosition={qaPosition}
        qaTask={qaTask}
        setHoveredPhaseTaskId={setHoveredPhaseTaskId}
        taskId={task.id}
        totalParts={totalParts}
      />
      <OccupancyLinkBlockOutline
        hoveredPhaseTaskId={hoveredPhaseTaskId ?? null}
        linkAlreadyExistsFromSource={planPhaseBarsProps.linkAlreadyExistsFromSource}
        linkingFromTaskId={planPhaseBarsProps.linkingFromTaskId}
        phaseBarHeightPx={phaseBarHeightPx}
        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
        position={position}
        qaPosition={qaPosition}
        qaTask={qaTask}
        task={task}
        totalParts={totalParts}
        validTargetByTime={planPhaseBarsProps.validTargetByTime}
      />
      {position &&
        (task.status === 'in-progress' || task.status === 'todo') && (
          <OccupancyBaselineBar
            barHeight={phaseBarHeightPx}
            barTopOffset={phaseBarTopOffsetPx}
            changelog={factChangelog}
            position={position}
            positionPreviews={positionPreviews}
            sprintStartDate={sprintStartDate}
            task={task}
            taskId={task.id}
            totalParts={totalParts}
          />
        )}
      {qaTask &&
        qaPosition &&
        (qaTask.status === 'in-progress' || qaTask.status === 'todo') && (
          <OccupancyBaselineBar
            barHeight={phaseBarHeightPx}
            barTopOffset={phaseBarTopOffsetPx}
            changelog={factChangelogs.get(qaTask.id)}
            position={qaPosition}
            positionPreviews={positionPreviews}
            sprintStartDate={sprintStartDate}
            task={qaTask}
            taskId={qaTask.id}
            totalParts={totalParts}
          />
        )}
      {planPhaseBarsProps.position && (
        <OccupancyDevPhaseBars
          {...planPhaseBarsProps}
          positionPreviews={positionPreviews}
          setHoveredPhaseTaskId={setHoveredPhaseTaskId}
          timelineSettings={timelineSettings}
        />
      )}
      {planPhaseBarsProps.qaTask &&
        planPhaseBarsProps.qaPosition && (
          <OccupancyQaPhaseBars
            {...planPhaseBarsProps}
            positionPreviews={positionPreviews}
            setHoveredPhaseTaskId={setHoveredPhaseTaskId}
            timelineSettings={timelineSettings}
          />
        )}
    </div>
  );
}
