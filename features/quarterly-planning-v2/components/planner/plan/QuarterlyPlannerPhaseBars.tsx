'use client';

import type { StoryPhasePosition } from '../../../types';
import type { Task, TaskPosition } from '@/types';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { OccupancyPhaseBar } from '@/features/sprint/components/SprintPlanner/occupancy/components/task-row/plan/OccupancyPhaseBar';
import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';

import { useQuarterlyWeekPositions } from '../../../hooks/useQuarterlyWeekPositions';
import { storyPhaseToTaskPosition } from '../../../utils/storyPhasePositions';

interface QuarterlyPlannerPhaseBarsProps {
  phases: StoryPhasePosition[];
  readonly?: boolean;
  rowHeightPx: number;
  storyKey: string;
  task: Task;
  weekCount: number;
  onPhaseContextMenu?: (e: React.MouseEvent, phase: StoryPhasePosition) => void;
  onPositionSave?: (position: TaskPosition, phase: StoryPhasePosition) => void;
}

/** Полосы фаз в одной строке (delivery и discovery не пересекаются по времени). */
export function QuarterlyPlannerPhaseBars({
  task,
  storyKey,
  phases,
  weekCount,
  rowHeightPx,
  readonly = false,
  onPositionSave,
  onPhaseContextMenu,
}: QuarterlyPlannerPhaseBarsProps) {
  const { fromWeekPosition, toWeekPosition } = useQuarterlyWeekPositions();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const cardStyles = getTaskCardStyles(task, 'swimlane', phaseCardColorScheme);

  const phaseBarProps = {
    barHeight: rowHeightPx,
    barTopOffset: 0,
    cellsPerDay: 1 as const,
    hideCenterContent: true,
    hideExtraDuration: true,
    internalWeekDividers: true,
    initials: '',
    isQa: false,
    planRowInsetPx: 0,
    showToolsEmoji: false,
    squareCorners: true,
    teamBorder: cardStyles.teamBorder,
    teamColor: cardStyles.teamColor,
    totalParts: weekCount,
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`absolute inset-0 ${readonly ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        {phases.map((phase) => {
          const position = storyPhaseToTaskPosition(storyKey, phase);
          const displayPosition = toWeekPosition(position);
          const isDiscovery = phase.kind === 'discovery';

          return (
            <div key={phase.id} className="absolute inset-0 pointer-events-none">
              <OccupancyPhaseBar
                {...phaseBarProps}
                badgeClass=""
                disableDragAndResize={readonly}
                forceDevColor={!isDiscovery}
                forceDiscoveryColor={isDiscovery}
                position={displayPosition}
                readonly={readonly}
                task={task}
                taskId={storyPhaseToTaskPosition(storyKey, phase).taskId}
                onContextMenu={
                  readonly || !onPhaseContextMenu
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPhaseContextMenu(e, phase);
                      }
                }
                onSave={
                  readonly || !onPositionSave
                    ? undefined
                    : (p) => onPositionSave(fromWeekPosition(p), phase)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
