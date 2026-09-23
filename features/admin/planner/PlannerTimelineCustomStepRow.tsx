'use client';

import type { PlannerTimelineStep, TimeslotsPerDay } from '@/lib/plannerTimelineScale';

import { useI18n } from '@/contexts/LanguageContext';
import { field } from '@/features/admin/adminUiTokens';
import {
  plannerDayLengthPlural,
  plannerSlotCenter,
} from '@/features/admin/planner/plannerTimelineRangeGeometry';

const THUMB_FACE =
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:mx-0 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-[box-shadow,background-color,border-color] [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:hover:bg-blue-500 [&::-moz-range-thumb]:hover:shadow-[0_0_0_5px_rgb(37_99_235/0.28)] [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:active:shadow-[0_0_0_7px_rgb(37_99_235/0.4)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mx-0 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-[box-shadow,background-color,border-color] [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:bg-blue-500 [&::-webkit-slider-thumb]:hover:shadow-[0_0_0_5px_rgb(37_99_235/0.28)] [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:active:shadow-[0_0_0_7px_rgb(37_99_235/0.4)] dark:[&::-moz-range-thumb]:hover:shadow-[0_0_0_5px_rgb(96_165_250/0.35)] dark:[&::-moz-range-thumb]:active:shadow-[0_0_0_7px_rgb(96_165_250/0.45)] dark:[&::-webkit-slider-thumb]:hover:shadow-[0_0_0_5px_rgb(96_165_250/0.35)] dark:[&::-webkit-slider-thumb]:active:shadow-[0_0_0_7px_rgb(96_165_250/0.45)]';

const RANGE_CLASS =
  `pointer-events-none absolute inset-0 m-0 h-full w-full appearance-none bg-transparent scheme-light dark:scheme-dark [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent ${THUMB_FACE}`;

const FROM_THUMB =
  '[&::-moz-range-thumb]:border-blue-800 [&::-moz-range-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-blue-800 [&::-webkit-slider-thumb]:bg-blue-600';

const DAY_TICK_CLASS =
  'pointer-events-none absolute top-0 z-[1] w-px -translate-x-1/2 bg-gray-300 dark:bg-white/25';

const LENGTH_KEY = {
  few: 'admin.plannerTimeline.lengthDaysFew',
  many: 'admin.plannerTimeline.lengthDaysMany',
  one: 'admin.plannerTimeline.lengthDay',
} as const;

function formatDayLength(
  slots: number,
  timeslotsPerDay: TimeslotsPerDay,
  language: string,
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  const days = slots / timeslotsPerDay;
  const value = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(days);
  return t(LENGTH_KEY[plannerDayLengthPlural(slots, timeslotsPerDay, language)], { value });
}

export function PlannerTimelineCustomStepRow({
  canRemove,
  index,
  isLast,
  nextSlots,
  onChange,
  onEdge,
  onRemove,
  step,
  timeslotsPerDay,
  trackSlots,
}: {
  canRemove: boolean;
  index: number;
  isLast: boolean;
  nextSlots: number | null;
  onChange: (step: PlannerTimelineStep) => void;
  onEdge: (value: number) => void;
  onRemove: () => void;
  step: PlannerTimelineStep;
  timeslotsPerDay: TimeslotsPerDay;
  trackSlots: number;
}) {
  const { language, t } = useI18n();
  const from = formatDayLength(step.slots, timeslotsPerDay, language, t);
  const until = nextSlots == null ? null : formatDayLength(nextSlots, timeslotsPerDay, language, t);
  const start = plannerSlotCenter(step.slots, trackSlots);
  const end = nextSlots == null ? null : plannerSlotCenter(nextSlots, trackSlots);
  const dayCount = trackSlots / timeslotsPerDay;

  return (
    <div className="contents">
      <button
        aria-label={t('admin.plannerTimeline.removeStep')}
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        disabled={!canRemove}
        type="button"
        onClick={onRemove}
      >
        <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 16 16">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
      <div className="relative">
        <input
          aria-label={t('admin.plannerTimeline.columnSp')}
          className={`${field} pr-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          min={1}
          name={`storyPoints-${index}`}
          type="number"
          value={step.storyPoints}
          onChange={(event) => {
            const storyPoints = Number(event.target.value);
            if (!Number.isInteger(storyPoints) || storyPoints < 1) return;
            onChange({ slots: step.slots, storyPoints });
          }}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
          {t('admin.plannerTimeline.spSuffix')}
        </span>
      </div>
      <div className="group/range relative self-stretch">
        {Array.from({ length: dayCount }, (_, day) => (
          <span
            key={day}
            aria-hidden
            className={`${DAY_TICK_CLASS} ${isLast ? 'bottom-0' : '-bottom-3'}`}
            style={{ left: plannerSlotCenter((day + 1) * timeslotsPerDay, trackSlots) }}
          />
        ))}
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded bg-gray-200 transition-colors group-hover/range:bg-gray-300 dark:bg-gray-700 dark:group-hover/range:bg-gray-600" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-blue-500/80 transition-colors group-hover/range:bg-blue-500"
          style={end == null ? { left: start, right: 0 } : { left: start, width: `calc(${end} - ${start})` }}
        />
        <input
          aria-label={t('admin.plannerTimeline.rangeFrom')}
          className={`${RANGE_CLASS} ${FROM_THUMB}`}
          max={trackSlots}
          min={1}
          style={{ zIndex: 2 }}
          type="range"
          value={step.slots}
          onChange={(event) => onEdge(Number(event.target.value))}
        />
      </div>
      <span className="text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
        {until == null ? t('admin.plannerTimeline.lengthOpen', { from }) : `${from} — ${until}`}
      </span>
    </div>
  );
}
