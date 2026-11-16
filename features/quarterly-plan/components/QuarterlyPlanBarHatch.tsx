'use client';

import type { DaySpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { QUARTER_ISSUE_HATCH } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanBarHatchProps {
  /** Отмеченные участки в днях квартала (`barDayMarks`). */
  ranges: ReadonlyArray<{ dayCount: number; startDay: number }>;
  /** Срок самой полосы: участки стоят в его долях. */
  span: DaySpan;
}

/**
 * Штриховка участков полосы, где работа под вопросом. Проблема и риск (дежурство) штрихуются одинаково:
 * их различает значок, а не узор.
 */
export function QuarterlyPlanBarHatch({ ranges, span }: QuarterlyPlanBarHatchProps) {
  return ranges.map((range) => {
    // Участок у края полосы повторяет её скругление: обрезка по контуру оставляет на углу зубец.
    const startsAtEdge = range.startDay === span.startDay;
    const endsAtEdge = range.startDay + range.dayCount === span.startDay + span.days;
    return (
      <span
        key={range.startDay}
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 ${startsAtEdge ? 'rounded-l-[7px]' : ''} ${endsAtEdge ? 'rounded-r-[7px]' : ''}`}
        style={{
          backgroundImage: QUARTER_ISSUE_HATCH,
          left: `${((range.startDay - span.startDay) / span.days) * 100}%`,
          width: `${(range.dayCount / span.days) * 100}%`,
        }}
      />
    );
  });
}
