'use client';

import type { PlannerTimelineStep, TimeslotsPerDay } from '@/lib/plannerTimelineScale';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { PlannerTimelineCustomStepRow } from '@/features/admin/planner/PlannerTimelineCustomStepRow';
import {
  clampPlannerTimelineStep,
  plannerSlotCenter,
  plannerTimelineTrackSlots,
} from '@/features/admin/planner/plannerTimelineRangeGeometry';

const MAX_CUSTOM_STEPS = 12;
const MAX_STEP_SLOTS = 400;
const DAY_TICK_CLASS =
  'pointer-events-none absolute z-[1] w-px -translate-x-1/2 bg-gray-300 dark:bg-white/25';

function stepsWithoutEnd(steps: readonly PlannerTimelineStep[]): PlannerTimelineStep[] {
  return steps.map(({ slots, storyPoints }) => ({ slots, storyPoints }));
}

export function PlannerTimelineCustomStepsFields({
  onChange,
  steps,
  timeslotsPerDay,
}: {
  onChange: (steps: PlannerTimelineStep[]) => void;
  steps: PlannerTimelineStep[];
  timeslotsPerDay: TimeslotsPerDay;
}) {
  const { t } = useI18n();
  const trackSlots = plannerTimelineTrackSlots(steps, timeslotsPerDay);
  const dayCount = trackSlots / timeslotsPerDay;
  const last = steps[steps.length - 1];

  return (
    <div className="space-y-3">
      <div className="grid w-full grid-cols-[2.5rem_7.25rem_minmax(0,1fr)_10.5rem] items-center gap-x-3 gap-y-3">
        <span />
        <span />
        <div className="relative h-6 text-xs text-gray-500 dark:text-gray-400">
          {Array.from({ length: dayCount }, (_, day) => {
            const left = plannerSlotCenter((day + 1) * timeslotsPerDay, trackSlots);
            return (
              <span key={day}>
                <span aria-hidden className={`${DAY_TICK_CLASS} top-4 -bottom-3`} style={{ left }} />
                <span className="absolute top-0 z-[2] -translate-x-1/2" style={{ left }}>
                  {day + 1}
                </span>
              </span>
            );
          })}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.plannerTimeline.axisDays')}</span>
        {steps.map((step, index) => (
          <PlannerTimelineCustomStepRow
            key={index}
            canRemove={steps.length > 1}
            index={index}
            isLast={index === steps.length - 1}
            nextSlots={steps[index + 1]?.slots ?? null}
            step={step}
            timeslotsPerDay={timeslotsPerDay}
            trackSlots={trackSlots}
            onChange={(next) =>
              onChange(stepsWithoutEnd(steps.map((row, rowIndex) => (rowIndex === index ? next : row))))
            }
            onEdge={(value) =>
              onChange(
                stepsWithoutEnd(
                  steps.map((row, rowIndex) =>
                    rowIndex === index ? clampPlannerTimelineStep(steps, index, value, trackSlots) : row
                  )
                )
              )
            }
            onRemove={() => onChange(stepsWithoutEnd(steps.filter((_, rowIndex) => rowIndex !== index)))}
          />
        ))}
      </div>
      <Button
        disabled={steps.length >= MAX_CUSTOM_STEPS}
        type="button"
        variant="outline"
        onClick={() => {
          const bound = last?.untilSlots ?? last?.slots ?? 0;
          const start = Math.min(MAX_STEP_SLOTS, bound + timeslotsPerDay);
          if (last && start <= bound) return;
          onChange(stepsWithoutEnd([...steps, { slots: start, storyPoints: (last?.storyPoints ?? 0) + 1 }]));
        }}
      >
        {t('admin.plannerTimeline.addStep')}
      </Button>
    </div>
  );
}
