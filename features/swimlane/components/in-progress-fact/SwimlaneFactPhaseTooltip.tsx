'use client';

import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { type StatusPhaseCell, formatDuration } from '@/lib/planner-timeline';

import { SwimlaneFactPhaseComments } from './SwimlaneFactPhaseComments';
import { SwimlaneFactPhaseReestimations } from './SwimlaneFactPhaseReestimations';
import {
  collectCommentsInPhaseWindow,
  collectReestimationsInPhaseWindow,
  collectStatusTransitionsForPhase,
  formatFactPhaseTaskLine,
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
  const durationStr = formatDuration(phase.durationMs);
  const isClosedStatus = normalizeFactStatusKey(phase.statusKey) === 'closed';

  const phaseStartMs = new Date(phase.startTime).getTime();
  const phaseEndMs = phase.endTime ? new Date(phase.endTime).getTime() : factualEndTimeMs;

  const transitions = collectStatusTransitionsForPhase(changelog, phase);
  const reestimations = collectReestimationsInPhaseWindow(changelog, phaseStartMs, phaseEndMs);
  const phaseComments = collectCommentsInPhaseWindow(issueComments, phaseStartMs, phaseEndMs);

  return (
    <div className="p-3 min-w-[280px] max-w-[400px] max-h-[min(70vh,480px)] overflow-y-auto">
      <div
        className={`flex items-center justify-between ${hideTaskSummary ? 'mb-2' : 'mb-3'}`}
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {phase.statusName.trim() || phase.statusKey}
        </h3>
        {!isClosedStatus && (
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{durationStr}</span>
        )}
      </div>

      {!hideTaskSummary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 break-words leading-snug">
          {formatFactPhaseTaskLine(taskId, tasksMap)}
        </p>
      )}

      <SwimlaneFactPhaseTransitions developerMap={developerMap} transitions={transitions} />

      <SwimlaneFactPhaseReestimations developerMap={developerMap} reestimations={reestimations} />

      <SwimlaneFactPhaseComments comments={phaseComments} developerMap={developerMap} />
    </div>
  );
}
