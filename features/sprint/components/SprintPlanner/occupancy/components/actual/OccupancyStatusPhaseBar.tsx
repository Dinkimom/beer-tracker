'use client';

import type { Developer, Task } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { getStatusColors } from '@/utils/statusColors';

import { formatDuration } from '../../utils/formatDuration';
import { type StatusPhaseCell } from '../../utils/statusToCells';
import { PhaseTooltip } from '../shared/PhaseTooltip';

import {
  OCCUPANCY_FACT_MIN_GAP_PX,
  OCCUPANCY_FACT_THREE_HOURS_MS,
  OCCUPANCY_FACT_VERY_SHORT_PHASE_MS,
} from './occupancyActualPhasesConstants';

interface OccupancyStatusPhaseBarProps {
  changelog: ChangelogEntry[];
  developerMap: Map<string, Developer>;
  phase: StatusPhaseCell;
  rowHeight: number;
  spanCells: number;
  taskId: string;
  tasksMap?: Map<string, Task>;
  timelineStartCell: number;
}

export function OccupancyStatusPhaseBar({
  changelog,
  developerMap,
  phase,
  rowHeight,
  spanCells,
  taskId,
  timelineStartCell,
  tasksMap,
}: OccupancyStatusPhaseBarProps) {
  const statusColors = getStatusColors(phase.statusKey);
  const widthInSpan = Math.min(phase.endCell - phase.startCell, spanCells - Math.max(0, phase.startCell - timelineStartCell));
  const durationStr = formatDuration(phase.durationMs);
  const bgClass = statusColors.bgDark
    ? `${statusColors.bg} ${statusColors.bgDark}`
    : statusColors.bg;
  const borderClass = statusColors.borderDark
    ? `${statusColors.border} ${statusColors.borderDark}`
    : statusColors.border;

  const verticalInset = 2;
  const bottomMargin = 8;
  const barHeight = Math.min(28, rowHeight - verticalInset - bottomMargin);

  const isVeryShort = phase.durationMs <= OCCUPANCY_FACT_VERY_SHORT_PHASE_MS;
  const minBarWidth = isVeryShort ? OCCUPANCY_FACT_MIN_GAP_PX : 2;

  const showText = phase.durationMs >= OCCUPANCY_FACT_THREE_HOURS_MS;
  const statusTooltipId = `${taskId}-${phase.startCell}-${phase.endCell}`;

  return (
    <TextTooltip
      content={
        <PhaseTooltip
          changelog={changelog}
          developerMap={developerMap}
          phase={phase}
          tasksMap={tasksMap}
        />
      }
      contentClassName="!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-gray-100 !p-0 !shadow-xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg"
      delayDuration={200}
      side="top"
      singleInGroupId={statusTooltipId}
    >
      <div
        className={`fact-timeline-marker-opacity flex shrink-0 items-center justify-center rounded-md overflow-hidden border-2 opacity-60 hover:opacity-100 pointer-events-auto cursor-pointer box-border ${bgClass} ${borderClass}`}
        style={{
          flex: `${widthInSpan} 0 0`,
          minWidth: minBarWidth,
          height: barHeight,
          zIndex: ZIndex.contentOverlay,
        }}
      >
        {showText && (
          <span
            className={`text-[10px] font-medium px-1.5 truncate max-w-full text-center leading-tight ${statusColors.text} ${statusColors.textDark ?? ''}`}
          >
            {durationStr}
          </span>
        )}
      </div>
    </TextTooltip>
  );
}
