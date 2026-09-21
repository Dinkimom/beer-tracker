'use client';

import type { StatusPhaseCell } from '../../utils/statusToCells';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry } from '@/types/tracker';

import { formatDuration } from '../../utils/formatDuration';

import { collectPhaseStatusTransitions } from './phaseTooltipCollectHelpers';
import { PhaseTooltipTransitionSection } from './PhaseTooltipTransitionSection';

function normalizeFactStatusKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '');
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface PhaseTooltipProps {
  changelog: ChangelogEntry[];
  developerMap: Map<string, Developer>;
  phase: StatusPhaseCell;
  /** Редко: слитые отрезки (подписи задач в тултипе) */
  tasksMap?: Map<string, Task>;
}

export function PhaseTooltip({ changelog, developerMap, phase, tasksMap }: PhaseTooltipProps) {
  const transitions = collectPhaseStatusTransitions(changelog, phase).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const durationStr = formatDuration(phase.durationMs);
  const isClosedStatus = normalizeFactStatusKey(phase.statusKey) === 'closed';
  const contributingIds = phase.contributingTaskIds?.filter(Boolean) ?? [];
  const contributingLines =
    tasksMap && contributingIds.length > 0
      ? contributingIds.map((id) => {
          const t = tasksMap.get(id);
          if (t) {
            const issueKey = (t as Task & { key?: string }).key ?? t.id;
            return `${issueKey}: ${t.name}`;
          }
          return id;
        })
      : [];

  return (
    <div className="p-3 min-w-[280px] max-w-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {phase.statusName.trim() || phase.statusKey}
        </h3>
        {!isClosedStatus && (
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{durationStr}</span>
        )}
      </div>

      {contributingLines.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
            Задачи
          </div>
          <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-1 list-disc pl-4">
            {contributingLines.map((line, i) => (
              <li key={`${contributingIds[i]}-${i}`} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PhaseTooltipTransitionSection
        contributingLines={contributingLines}
        developerMap={developerMap}
        formatDateTime={formatDateTime}
        transitions={transitions}
      />
    </div>
  );
}
