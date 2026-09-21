'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay, roundPointsForDisplay } from '@/lib/pointsUtils';

interface DeveloperHeaderPointsProps {
  showProgress: boolean;
  showSP: boolean;
  showTP: boolean;
  spContent: string;
  tpContent: string;
}

export function resolveDeveloperHeaderPointsVisibility(
  role: 'developer' | 'other' | 'tester' | undefined,
  totalSP: number,
  totalTP: number,
  showBothPointKinds = false,
  hasTasks?: boolean
): { hasPoints: boolean; showSP: boolean; showTP: boolean } {
  const rowHasWork = hasTasks ?? (totalSP > 0 || totalTP > 0);
  if (!rowHasWork) {
    return { hasPoints: false, showSP: false, showTP: false };
  }
  if (showBothPointKinds) {
    return { hasPoints: true, showSP: true, showTP: true };
  }
  const isTester = role === 'tester';
  return { hasPoints: true, showSP: !isTester, showTP: isTester };
}

function formatHeaderPointValue(
  showProgress: boolean,
  completed: number,
  total: number,
  percent: number,
  unit: 'sp' | 'tp',
  includeUnits: boolean
): string {
  const displayTotal = roundPointsForDisplay(total);
  if (displayTotal <= 0) {
    return `?${unit}`;
  }
  const displayCompleted = formatPointsForDisplay(completed);
  const displayTotalText = formatPointsForDisplay(displayTotal);
  if (showProgress) {
    return includeUnits
      ? `${displayCompleted}/${displayTotalText}${unit} (${percent}%)`
      : `${displayCompleted}/${displayTotalText} (${percent}%)`;
  }
  return includeUnits ? `${displayTotalText}${unit}` : displayTotalText;
}

export function formatDeveloperHeaderPointsContent(
  showProgress: boolean,
  completedSP: number,
  totalSP: number,
  percentSP: number,
  completedTP: number,
  totalTP: number,
  percentTP: number,
  includeUnits = false
): { spContent: string; tpContent: string } {
  return {
    spContent: formatHeaderPointValue(
      showProgress,
      completedSP,
      totalSP,
      percentSP,
      'sp',
      includeUnits
    ),
    tpContent: formatHeaderPointValue(
      showProgress,
      completedTP,
      totalTP,
      percentTP,
      'tp',
      includeUnits
    ),
  };
}

function developerHeaderPointTitle(showProgress: boolean, kind: 'sp' | 'tp'): string {
  if (kind === 'sp') {
    return showProgress ? 'Story points: сделано / всего' : 'Story points';
  }
  return showProgress ? 'Test points: сделано / всего' : 'Test points';
}

function renderDeveloperHeaderPointSpan(
  content: string,
  kind: 'sp' | 'tp',
  showProgress: boolean
) {
  return <span title={developerHeaderPointTitle(showProgress, kind)}>{content}</span>;
}

export function DeveloperHeaderPoints({
  hasPoints,
  showProgress,
  showSP,
  showTP,
  spContent,
  tpContent,
}: DeveloperHeaderPointsProps & { hasPoints: boolean }) {
  const { t } = useI18n();
  if (!hasPoints) {
    return (
      <span className="text-gray-500 dark:text-gray-400">
        {t('sprintPlanner.swimlane.noTasks')}
      </span>
    );
  }

  return (
    <>
      {showSP ? renderDeveloperHeaderPointSpan(spContent, 'sp', showProgress) : null}
      {showSP && showTP ? <span aria-hidden> · </span> : null}
      {showTP ? renderDeveloperHeaderPointSpan(tpContent, 'tp', showProgress) : null}
    </>
  );
}
