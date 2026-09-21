'use client';

import type { BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';

import { useI18n } from '@/contexts/LanguageContext';

import {
  buildEpicPointsSummaryParts,
  isEpicPointsScopeEmpty,
} from './quarterlyPlannerEpicPointsSummaryHelpers';

interface QuarterlyPlannerEpicPointsSummaryProps {
  isLoading: boolean;
  tiles: BurndownTilesFromTasks | null;
}

const EPIC_POINTS_TEXT_CLASS =
  'mt-0.5 mb-1 truncate text-xs leading-snug tabular-nums text-gray-500 dark:text-gray-400';

export function QuarterlyPlannerEpicPointsSummary({
  isLoading,
  tiles,
}: QuarterlyPlannerEpicPointsSummaryProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <p className={`${EPIC_POINTS_TEXT_CLASS} text-gray-400 dark:text-gray-500`}>
        {t('planning.quarterlyV2.epicPointsLoading')}
      </p>
    );
  }

  if (!tiles) return null;

  if (isEpicPointsScopeEmpty(tiles)) {
    return (
      <p className={`${EPIC_POINTS_TEXT_CLASS} text-gray-400 dark:text-gray-500`}>
        {t('planning.quarterlyV2.epicPointsEmpty')}
      </p>
    );
  }

  const parts = buildEpicPointsSummaryParts(tiles, t);

  return (
    <p className={EPIC_POINTS_TEXT_CLASS} title={parts.join(' · ')}>
      {parts.join(' · ')}
    </p>
  );
}
