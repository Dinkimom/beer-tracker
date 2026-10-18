'use client';

import { useRef } from 'react';

import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { usePlannerPatternOffset } from '@/features/sprint/components/SprintPlanner/layout/usePlannerPatternOffset';

interface TimelineWeekendHatchProps {
  dayCount: number;
  daySpan: number;
  startDay: number;
}

/**
 * Непрерывный блок нерабочих дней. Узор привязан к общему листу доски,
 * поэтому соседние строки и дни показывают одну картинку, а не новый штамп.
 */
export function TimelineWeekendHatch({
  dayCount,
  daySpan,
  startDay,
}: TimelineWeekendHatchProps) {
  const ref = useRef<HTMLDivElement>(null);
  const patternOffset = usePlannerPatternOffset(ref);
  return (
    <div
      ref={ref}
      className="absolute inset-y-0 overflow-hidden"
      style={{
        left: `${(startDay / dayCount) * 100}%`,
        width: `${(daySpan / dayCount) * 100}%`,
      }}
    >
      <PlannerHatchOverlay patternOffset={patternOffset} tone="weekend" />
    </div>
  );
}
