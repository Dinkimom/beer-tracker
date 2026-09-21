'use client';

import type { CSSProperties } from 'react';

import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';

interface SprintPlannerTimelineFillProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Заливка пустой зоны таймлайна: фон как у колонок дней + диагональная штриховка.
 * Справа (короткий спринт) и снизу (футер на оставшуюся высоту).
 */
export function SprintPlannerTimelineFill({
  className = '',
  style,
}: SprintPlannerTimelineFillProps) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden bg-white dark:bg-gray-800 ${className}`.trim()}
      style={style}
    >
      <PlannerHatchOverlay />
    </div>
  );
}
