'use client';

import type { PositionPreview } from './OccupancyPhaseBar';
import type { Task, TaskPosition } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { ZIndex } from '@/constants';

import {
  resolveOccupancyBaselineEndCell,
  resolveOccupancyBaselinePlannedEndCell,
} from './occupancyBaselineBarHelpers';
import {
  PHASE_BAR_HEIGHT_PX,
  PHASE_BAR_TOP_OFFSET_PX,
  PHASE_ROW_INSET_PX,
} from './occupancyPhaseBarConstants';

interface OccupancyBaselineBarProps {
  barHeight?: number;
  barTopOffset?: number;
  changelog?: ChangelogEntry[];
  position: TaskPosition;
  positionPreviews: Map<string, PositionPreview>;
  sprintStartDate: Date;
  task?: Task;
  taskId: string;
  totalParts: number;
}

/** Бейзлайн от конца плана до факта (readyForTest для разработки) или до «сейчас» (полосатая зона просрочки); при перетаскивании используем превью. «Сейчас» — по текущему времени (9:00–18:00, с 18:00 на всю ширину дня). */
export function OccupancyBaselineBar({
  barHeight = PHASE_BAR_HEIGHT_PX,
  barTopOffset = PHASE_BAR_TOP_OFFSET_PX,
  changelog,
  position,
  positionPreviews,
  sprintStartDate,
  task,
  taskId,
  totalParts,
}: OccupancyBaselineBarProps) {
  const preview = positionPreviews.get(taskId);
  const plannedEndCell = resolveOccupancyBaselinePlannedEndCell(position, preview);
  const baselineEndCell = resolveOccupancyBaselineEndCell({
    changelog,
    effectivePosition: preview ? { ...position, ...preview } : position,
    plannedEndCell,
    sprintStartDate,
    task,
    totalParts,
  });

  if (plannedEndCell >= baselineEndCell) return null;

  const baselineStart = plannedEndCell;
  const baselineWidth = baselineEndCell - plannedEndCell;

  return (
    <div
      key={`baseline-${taskId}`}
      className={`absolute pointer-events-none overflow-hidden rounded-lg ${ZIndex.class('baselineOverBar')}`}
      style={{
        left: `calc(${(baselineStart / totalParts) * 100}% - ${PHASE_ROW_INSET_PX}px)`,
        width: `${(baselineWidth / totalParts) * 100}%`,
        height: barHeight,
        top: barTopOffset,
        background:
          'repeating-linear-gradient(45deg, rgb(254 226 226), rgb(254 226 226) 8px, rgb(252 165 165) 8px, rgb(252 165 165) 16px)',
      }}
    >
      <div
        className="absolute inset-0 dark:block hidden"
        style={{
          background:
            'repeating-linear-gradient(45deg, rgb(127 29 29), rgb(127 29 29) 8px, rgb(153 27 27) 8px, rgb(153 27 27) 16px)',
        }}
      />
    </div>
  );
}
