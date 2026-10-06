'use client';

import type { PlanAnchorGeometry } from '@/features/swimlane/utils/planAnchorGhost';
import type { TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { factTimelineHolidayMask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import { planAnchorGhostStrips } from '@/features/swimlane/utils/planAnchorGhost';
import { buildSwimlaneOverdueBaselineStripHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';

interface TaskLayerPlanAnchorGhostProps {
  anchor: PlanAnchorGeometry;
  baselineHeight: number;
  baselineTop: number;
  holidayDayIndices?: ReadonlySet<number>;
  position: TaskPosition;
  timelineTotalParts: number;
}

export function TaskLayerPlanAnchorGhost({
  anchor,
  baselineHeight,
  baselineTop,
  holidayDayIndices,
  position,
  timelineTotalParts,
}: TaskLayerPlanAnchorGhostProps) {
  const { t } = useI18n();
  const strips = planAnchorGhostStrips(anchor, position, getPartsPerDay());
  if (!strips || strips.length === 0 || timelineTotalParts <= 0) return null;

  const holidayMask = factTimelineHolidayMask(
    holidayDayIndices,
    timelineTotalParts,
    getPartsPerDay()
  );
  const holidayMaskStyle: CSSProperties | undefined = holidayMask
    ? { maskImage: holidayMask, WebkitMaskImage: holidayMask }
    : undefined;
  const label = t('sprintPlanner.swimlane.planAnchor');

  return (
    <div className="pointer-events-none absolute inset-0" style={holidayMaskStyle}>
      {strips.map((strip) => (
        <div
          key={`${strip.start}-${strip.width}`}
          aria-label={label}
          className={`pointer-events-auto absolute rounded-lg border border-dashed border-gray-400 bg-transparent dark:border-gray-500 ${ZIndex.class('base')}`}
          style={{
            height: `${baselineHeight}px`,
            top: `${baselineTop}px`,
            ...buildSwimlaneOverdueBaselineStripHorizontalStyle({
              durationCells: strip.width,
              startCell: strip.start,
              timelineTotalParts,
            }),
          }}
          title={label}
        />
      ))}
    </div>
  );
}
