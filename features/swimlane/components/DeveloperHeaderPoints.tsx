'use client';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay, roundPointsForDisplay } from '@/lib/pointsUtils';

export interface DeveloperHeaderVelocityReadout {
  points: number;
  sprintCount: number;
  unit: 'sp' | 'tp';
}

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

function velocityTooltipKey(unit: 'sp' | 'tp'): string {
  return unit === 'sp'
    ? 'sprintPlanner.swimlane.velocityTooltipSp'
    : 'sprintPlanner.swimlane.velocityTooltipTp';
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
  return (
    <TextTooltip content={developerHeaderPointTitle(showProgress, kind)}>
      <span>{content}</span>
    </TextTooltip>
  );
}

export function DeveloperHeaderPoints({
  hasPoints,
  showProgress,
  showSP,
  showTP,
  spContent,
  tpContent,
  velocity,
}: DeveloperHeaderPointsProps & {
  hasPoints: boolean;
  velocity?: DeveloperHeaderVelocityReadout | null;
}) {
  const { t } = useI18n();
  const sprintLine = hasPoints ? (
    <>
      {showSP ? renderDeveloperHeaderPointSpan(spContent, 'sp', showProgress) : null}
      {showSP && showTP ? <span aria-hidden> · </span> : null}
      {showTP ? renderDeveloperHeaderPointSpan(tpContent, 'tp', showProgress) : null}
    </>
  ) : (
    t('sprintPlanner.swimlane.noTasks')
  );
  const velocityLine = velocity ? (
    <TextTooltip content={t(velocityTooltipKey(velocity.unit), { count: velocity.sprintCount })}>
      <span>
        {t('sprintPlanner.swimlane.velocityLabel', {
          points: formatPointsForDisplay(velocity.points),
        })}
      </span>
    </TextTooltip>
  ) : null;

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="min-w-0 truncate">{sprintLine}</span>
      {velocityLine ? <span className="min-w-0 truncate">{velocityLine}</span> : null}
    </span>
  );
}
