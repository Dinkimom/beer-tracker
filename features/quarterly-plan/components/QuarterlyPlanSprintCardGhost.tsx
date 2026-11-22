'use client';

import type { QuarterlyPlanAssignment, QuarterlyPlanSprintCard } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { daySpanFields } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { sprintCardDrift } from '@/lib/quarterlyPlans/quarterlyPlanSprintCards';

import { useQuarterBarsTop, useQuarterLaneHeight, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { formatSpanRange, QUARTER_ROW_PADDING_PX } from '../quarterlyPlanBoardModel';

interface QuarterlyPlanSprintCardGhostProps {
  /** Полосы строки задачи. */
  assignments: readonly QuarterlyPlanAssignment[];
  /** Карточка этой задачи на доске спринта; нет — задачи на досках спринтов квартала нет. */
  card: QuarterlyPlanSprintCard | undefined;
  /** Строка задачи: клик синхронизирует её. */
  epicId: string;
}

/**
 * Расхождение плана и спринта (QK8): пунктирный контур там, где карточка задачи стоит на доске спринта,
 * если это не дни её полос в плане. Само ничего не двигается; клик — поповер с синхронизацией этой задачи (QK9).
 */
export const QuarterlyPlanSprintCardGhost = observer(function QuarterlyPlanSprintCardGhost({ assignments, card, epicId }: QuarterlyPlanSprintCardGhostProps) {
  const { t } = useI18n();
  const { menu } = useQuarterlyPlanBoard();
  const { openSprintDrift: onSprintDriftClick } = menu;
  const { dayCount, weeks } = useQuarterPlanView();
  const laneHeightPx = useQuarterLaneHeight();
  const barsTopPx = useQuarterBarsTop();
  const span = sprintCardDrift({ assignments, card, weeks });
  if (!span || !card) return null;
  const label = t('quarterlyPlan.sprintDrift', {
    range: formatSpanRange(weeks, daySpanFields(span)),
    sprint: card.sprintName,
  });
  return (
    <TextTooltip content={label} side="top">
      <button
        aria-label={`${label}. ${t('quarterlyPlan.sync.title')}`}
        className="absolute flex cursor-pointer items-center justify-end rounded-lg border border-dashed border-amber-500 bg-amber-400/10 pr-1 text-amber-600 transition-colors hover:bg-amber-400/25 active:bg-amber-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-400 dark:text-amber-300"
        style={{
          height: laneHeightPx - 4,
          left: `calc(${(span.startDay / dayCount) * 100}% + 2px)`,
          top: QUARTER_ROW_PADDING_PX + barsTopPx + 2,
          width: `calc(${(span.days / dayCount) * 100}% - 4px)`,
          // Под полосами: полоса плана — главное, контур виден там, где они не совпали.
          zIndex: ZIndex.contentInteractive - 1,
        }}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSprintDriftClick(epicId, { x: event.clientX, y: event.clientY });
        }}
      >
        {span.days > 1 ? <Icon className="h-3 w-3" name="calendar" /> : null}
      </button>
    </TextTooltip>
  );
});
