'use client';

import {
  PLANNER_HATCH_TONES,
  plannerHatchImage,
  type PlannerHatchTone,
} from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

interface PlannerHatchOverlayProps {
  /** По умолчанию нейтральная штриховка «не слот». Цветные тона — отпуска и др. */
  tone?: PlannerHatchTone;
}

/** Диагональная штриховка «не слот человека / не день спринта» или недоступность. */
export function PlannerHatchOverlay({ tone = 'neutral' }: PlannerHatchOverlayProps) {
  const colors = PLANNER_HATCH_TONES[tone];

  return (
    <>
      {colors.lightFill ? (
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{ backgroundColor: colors.lightFill }}
        />
      ) : null}
      {colors.darkFill ? (
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ backgroundColor: colors.darkFill }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{ backgroundImage: plannerHatchImage(colors.lightLine) }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ backgroundImage: plannerHatchImage(colors.darkLine) }}
      />
    </>
  );
}
