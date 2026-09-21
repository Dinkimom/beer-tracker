'use client';

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

import {
  PLANNER_HATCH_BASE_CLASS,
  PLANNER_HATCH_TONES,
} from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

interface PlannerAvailabilityLabelBackgroundProps {
  tone: AvailabilityCardKind;
}

/** Фон лейбла: база + заливка тона, без штриховки (непрозрачно перекрывает линии под текстом). */
export function PlannerAvailabilityLabelBackground({ tone }: PlannerAvailabilityLabelBackgroundProps) {
  const colors = PLANNER_HATCH_TONES[tone];

  return (
    <>
      <div className={`pointer-events-none absolute inset-0 ${PLANNER_HATCH_BASE_CLASS}`} />
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
    </>
  );
}
