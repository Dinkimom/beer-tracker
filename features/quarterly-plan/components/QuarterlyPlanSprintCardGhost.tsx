'use client';

import type { QuarterlyPlanAssignment, QuarterlyPlanSprintCard } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { daySpanFields } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { sprintCardDrift } from '@/lib/quarterlyPlans/quarterlyPlanSprintCards';

import { useQuarterLaneHeight, useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { formatSpanRange, QUARTER_ROW_PADDING_PX } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanSprintCardGhostProps {
  /** Полосы строки задачи. */
  assignments: readonly QuarterlyPlanAssignment[];
  /** Карточка этой задачи на доске спринта; нет — задачи на досках спринтов квартала нет. */
  card: QuarterlyPlanSprintCard | undefined;
}

/**
 * Расхождение плана и спринта (QK8): пунктирный контур там, где карточка задачи стоит на доске спринта,
 * если это не дни её полос в плане. Ничего само не двигается — контур показывает, что сроки разошлись.
 */
export function QuarterlyPlanSprintCardGhost({ assignments, card }: QuarterlyPlanSprintCardGhostProps) {
  const { t } = useI18n();
  const { dayCount, weeks } = useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const span = sprintCardDrift({ assignments, card, weeks });
  if (!span || !card) return null;
  const label = t('quarterlyPlan.sprintDrift', {
    range: formatSpanRange(weeks, daySpanFields(span)),
    sprint: card.sprintName,
  });
  return (
    <TextTooltip content={label} side="top">
      <div
        aria-label={label}
        className="absolute flex items-center justify-end rounded-lg border border-dashed border-amber-500 bg-amber-400/10 pr-1 text-amber-600 dark:border-amber-400 dark:text-amber-300"
        role="img"
        style={{
          height: laneHeightPx - 4,
          left: `calc(${(span.startDay / dayCount) * 100}% + 2px)`,
          top: QUARTER_ROW_PADDING_PX + 2,
          width: `calc(${(span.days / dayCount) * 100}% - 4px)`,
          // Под полосами: полоса плана — главное, контур виден там, где они не совпали.
          zIndex: ZIndex.contentInteractive - 1,
        }}
      >
        {span.days > 1 ? <Icon className="h-3 w-3" name="calendar" /> : null}
      </div>
    </TextTooltip>
  );
}
