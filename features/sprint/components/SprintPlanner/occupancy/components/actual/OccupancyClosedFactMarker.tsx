'use client';

import type { Developer, Task } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { getStatusColors } from '@/utils/statusColors';

import { type StatusPhaseCell } from '../../utils/statusToCells';
import { PhaseTooltip } from '../shared/PhaseTooltip';

import { OCCUPANCY_FACT_MIN_GAP_PX } from './occupancyActualPhasesConstants';

interface OccupancyClosedFactMarkerProps {
  changelog: ChangelogEntry[];
  developerMap: Map<string, Developer>;
  phase: StatusPhaseCell;
  rowHeight: number;
  taskId: string;
  tasksMap?: Map<string, Task>;
}

export function OccupancyClosedFactMarker({
  changelog,
  developerMap,
  phase,
  rowHeight,
  taskId,
  tasksMap,
}: OccupancyClosedFactMarkerProps) {
  const statusColors = getStatusColors(phase.statusKey);
  const verticalInset = 2;
  const bottomMargin = 8;
  const barHeight = Math.min(28, rowHeight - verticalInset - bottomMargin);
  const markerSize = Math.max(OCCUPANCY_FACT_MIN_GAP_PX, barHeight);
  const bgClass = statusColors.bgDark
    ? `${statusColors.bg} ${statusColors.bgDark}`
    : statusColors.bg;
  const borderClass = statusColors.borderDark
    ? `${statusColors.border} ${statusColors.borderDark}`
    : statusColors.border;
  const statusTooltipId = `${taskId}-closed-${phase.startCell}-${phase.endCell}`;

  return (
    <div
      className="pointer-events-none flex shrink-0 items-center justify-center self-center"
      style={{ width: markerSize, zIndex: ZIndex.contentOverlay }}
    >
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
          aria-label={`${phase.statusKey}: закрыто`}
          className={`fact-timeline-marker-opacity pointer-events-auto flex shrink-0 items-center justify-center rounded-md overflow-hidden border-2 opacity-60 shadow-sm hover:opacity-100 cursor-pointer box-border ${bgClass} ${borderClass}`}
          role="img"
          style={{
            width: markerSize,
            height: markerSize,
          }}
        >
          <Icon
            className={`shrink-0 ${statusColors.text} ${statusColors.textDark ?? ''}`}
            name="check"
            size="sm"
          />
        </div>
      </TextTooltip>
    </div>
  );
}
