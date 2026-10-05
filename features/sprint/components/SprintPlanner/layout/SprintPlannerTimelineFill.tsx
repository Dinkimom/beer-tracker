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
  const surfaceClass = 'bg-white dark:bg-gray-800';
  return (
    <div
      aria-hidden
      className={`@container/timeline-rail relative overflow-hidden ${surfaceClass} ${className}`.trim()}
      style={style}
    >
      <PlannerHatchOverlay />
      {/* Есть ширина — линия отделяет дни от штриховки. Нулевая ширина — край уже рисует рамка острова. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] hidden w-px bg-gray-200 @min-[1px]/timeline-rail:block dark:bg-gray-600" />
    </div>
  );
}
