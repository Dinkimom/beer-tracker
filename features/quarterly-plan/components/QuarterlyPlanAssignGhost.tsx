'use client';

import type { QuarterlyPlanPhase } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { ZIndex } from '@/constants';

import { useQuarterLaneHeight, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_PADDING_PX } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanAssignGhostProps {
  /** Меню закрыто — превью гаснет вместе с ним. */
  closing: boolean;
  lane: number;
  phase: QuarterlyPlanPhase;
  startWeek: number;
  weeks: number;
}

/**
 * Превью будущей полосы, пока открыто меню назначения: пунктирный контур на тех неделях и в той дорожке,
 * куда она встанет. Меню не висит в воздухе — видно, к какой строке и срокам оно относится.
 */
export function QuarterlyPlanAssignGhost({ closing, lane, phase, startWeek, weeks }: QuarterlyPlanAssignGhostProps) {
  const { weeks: quarterWeeks } = useQuarterPlanView();
  const laneHeightPx = useQuarterLaneHeight();
  return (
    <div
      aria-hidden
      className={`quarter-assign-ghost pointer-events-none absolute rounded-lg border-2 border-dashed border-blue-500 transition-opacity duration-200 dark:border-blue-400 ${closing ? 'opacity-0' : ''} ${
        phase === 'delivery' ? 'bg-blue-500/15 dark:bg-blue-400/20' : 'bg-blue-500/5 dark:bg-blue-400/10'
      }`}
      style={{
        height: laneHeightPx - 4,
        left: `calc(${(startWeek / quarterWeeks.length) * 100}% + 2px)`,
        top: QUARTER_ROW_PADDING_PX + lane * laneHeightPx + 2,
        width: `calc(${(weeks / quarterWeeks.length) * 100}% - 4px)`,
        zIndex: ZIndex.contentInteractive + 1,
      }}
    />
  );
}
