'use client';

import { Fragment } from 'react';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { UnestimatedTasksCount } from '@/features/sprint/components/UnestimatedTasksCount';
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
  hasTasks?: boolean,
  /** Режим отдельных QA-задач: оценки в SP, TP в шапке не показываем. */
  hideTestPoints = false
): { hasPoints: boolean; showSP: boolean; showTP: boolean } {
  const rowHasWork = hasTasks ?? (totalSP > 0 || totalTP > 0);
  if (!rowHasWork) {
    return { hasPoints: false, showSP: false, showTP: false };
  }
  if (showBothPointKinds) {
    return { hasPoints: true, showSP: true, showTP: !hideTestPoints };
  }
  if (hideTestPoints) {
    return { hasPoints: true, showSP: true, showTP: false };
  }
  const hasSP = totalSP > 0;
  const hasTP = totalTP > 0;
  // Роль неизвестна (исполнитель спринта вне team_members) или «другое» — показываем то, что есть.
  if (role !== 'developer' && role !== 'tester') {
    return { hasPoints: true, showSP: hasSP || !hasTP, showTP: hasTP };
  }
  // По роли — свой вид очков; если он пуст, а другой нет — показываем другой, а не «0».
  const preferTP = role === 'tester' ? hasTP || !hasSP : hasTP && !hasSP;
  return { hasPoints: true, showSP: !preferTP, showTP: preferTP };
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

function developerHeaderPointTitleKey(showProgress: boolean, kind: 'sp' | 'tp'): string {
  const base = 'sprintPlanner.swimlane.pointsTooltip';
  if (kind === 'sp') {
    return showProgress ? `${base}.spProgress` : `${base}.sp`;
  }
  return showProgress ? `${base}.tpProgress` : `${base}.tp`;
}

function renderVelocityLine(
  velocity: DeveloperHeaderVelocityReadout,
  t: (key: string, params?: Record<string, number | string>) => string
) {
  return (
    <TextTooltip content={t(velocityTooltipKey(velocity.unit), { count: velocity.sprintCount })}>
      <span>
        {t('sprintPlanner.swimlane.velocityLabel', {
          points: formatPointsForDisplay(velocity.points),
        })}
      </span>
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
  unestimated,
  velocity,
}: DeveloperHeaderPointsProps & {
  hasPoints: boolean;
  /** Задачи без оценки; `onlyUnestimated` — оценённого объёма нет, вместо «0/0» только счётчик. */
  unestimated: { count: number; onlyUnestimated: boolean };
  velocity?: DeveloperHeaderVelocityReadout | null;
}) {
  const { t } = useI18n();
  const showPoints = !(unestimated.count > 0 && unestimated.onlyUnestimated);
  const parts = [
    showPoints && showSP ? { content: spContent, kind: 'sp' as const } : null,
    showPoints && showTP ? { content: tpContent, kind: 'tp' as const } : null,
    unestimated.count > 0 ? { content: '', kind: 'unestimated' as const } : null,
  ].filter((part) => part != null);
  const sprintLine = hasPoints
    ? parts.map((part, index) => (
        <Fragment key={part.kind}>
          {index > 0 ? <span aria-hidden> · </span> : null}
          {part.kind === 'unestimated' ? (
            <UnestimatedTasksCount count={unestimated.count} />
          ) : (
            <TextTooltip content={t(developerHeaderPointTitleKey(showProgress, part.kind))}>
              <span>{part.content}</span>
            </TextTooltip>
          )}
        </Fragment>
      ))
    : t('sprintPlanner.swimlane.noTasks');
  const velocityLine = velocity ? renderVelocityLine(velocity, t) : null;

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="min-w-0 truncate">{sprintLine}</span>
      {velocityLine ? <span className="min-w-0 truncate">{velocityLine}</span> : null}
    </span>
  );
}
