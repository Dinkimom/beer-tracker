'use client';

import type { StatusPhaseCell } from '@/lib/planner-timeline';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';

import { SwimlaneFactPhaseComments } from './SwimlaneFactPhaseComments';
import { SwimlaneFactPhaseReestimations } from './SwimlaneFactPhaseReestimations';
import {
  collectCommentsInPhaseWindow,
  collectReestimationsInPhaseWindow,
  collectStatusTransitionsForPhase,
  formatFactPhaseTaskLine,
  formatFactTimelineDuration,
  normalizeFactStatusKey,
} from './SwimlaneFactPhaseTooltipHelpers';
import { SwimlaneFactPhaseTransitions } from './SwimlaneFactPhaseTransitions';

interface SwimlaneFactPhaseTooltipProps {
  changelog: ChangelogEntry[];
  developerMap: Map<string, Developer>;
  /** Верхняя граница интервала для комментариев/переоценок при открытой фазе (как у сегмента) */
  factualEndTimeMs: number;
  hideTaskSummary?: boolean;
  issueComments: IssueComment[];
  phase: StatusPhaseCell;
  taskId: string;
  tasksMap: Map<string, Task>;
}

/**
 * Тултип колбасы факта: длительность, переходы статуса, переоценки и комментарии за интервал фазы.
 */
export function SwimlaneFactPhaseTooltip({
  changelog,
  developerMap,
  factualEndTimeMs,
  hideTaskSummary = false,
  issueComments,
  phase,
  taskId,
  tasksMap,
}: SwimlaneFactPhaseTooltipProps) {
  const { t } = useI18n();
  const durationStr = formatFactTimelineDuration(phase.durationMs, t);
  const isClosedStatus = normalizeFactStatusKey(phase.statusKey) === 'closed';

  const phaseStartMs = new Date(phase.startTime).getTime();
  const phaseEndMs = phase.endTime ? new Date(phase.endTime).getTime() : factualEndTimeMs;

  const transitions = collectStatusTransitionsForPhase(changelog, phase);
  const reestimations = collectReestimationsInPhaseWindow(changelog, phaseStartMs, phaseEndMs);
  const phaseComments = collectCommentsInPhaseWindow(issueComments, phaseStartMs, phaseEndMs);

  return (
    <div className="min-w-[280px] max-w-[400px] max-h-[min(70vh,480px)] overflow-y-auto">
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {phase.statusName.trim() || phase.statusKey}
          </h3>
          {!isClosedStatus && (
            <span className="shrink-0 text-xs tabular-nums text-ds-text-muted">{durationStr}</span>
          )}
        </div>

        {!hideTaskSummary && (
          <p className="mt-1 text-xs leading-snug break-words text-gray-600 dark:text-gray-300">
            {formatFactPhaseTaskLine(taskId, tasksMap)}
          </p>
        )}
      </div>

      <SwimlaneFactPhaseTransitions developerMap={developerMap} transitions={transitions} />

      <SwimlaneFactPhaseReestimations developerMap={developerMap} reestimations={reestimations} />

      <SwimlaneFactPhaseComments comments={phaseComments} developerMap={developerMap} />
    </div>
  );
}
