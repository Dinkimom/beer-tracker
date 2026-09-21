import type { useI18n } from '@/contexts/LanguageContext';
import type { BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';

import { formatPointsForDisplay, roundPointsForDisplay } from '@/lib/pointsUtils';

type Translate = ReturnType<typeof useI18n>['t'];

export function isEpicPointsScopeEmpty(tiles: BurndownTilesFromTasks): boolean {
  return roundPointsForDisplay(tiles.totalScopeSP) === 0 && roundPointsForDisplay(tiles.totalScopeTP) === 0;
}

export function buildEpicPointsSummaryParts(
  tiles: BurndownTilesFromTasks,
  t: Translate
): string[] {
  const {
    totalScopeSP,
    totalScopeTP,
    completedSP,
    completedTP,
    completionPercentSP,
    completionPercentTP,
  } = tiles;
  const parts: string[] = [];

  if (roundPointsForDisplay(totalScopeSP) > 0) {
    parts.push(
      t('planning.quarterlyV2.epicPointsSp', {
        done: formatPointsForDisplay(completedSP),
        total: formatPointsForDisplay(totalScopeSP),
        percent: completionPercentSP,
      })
    );
  }
  if (roundPointsForDisplay(totalScopeTP) > 0) {
    parts.push(
      t('planning.quarterlyV2.epicPointsTp', {
        done: formatPointsForDisplay(completedTP),
        total: formatPointsForDisplay(totalScopeTP),
        percent: completionPercentTP,
      })
    );
  }

  return parts;
}
