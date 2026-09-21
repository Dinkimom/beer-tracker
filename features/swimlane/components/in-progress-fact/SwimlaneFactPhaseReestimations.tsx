'use client';

import type { PhaseReestimationEvent } from './SwimlaneFactPhaseTooltipHelpers';
import type { Developer } from '@/types';

import { formatFactPhaseDateTime } from './SwimlaneFactPhaseTooltipHelpers';

export function SwimlaneFactPhaseReestimations({
  developerMap,
  reestimations,
}: {
  developerMap: Map<string, Developer>;
  reestimations: PhaseReestimationEvent[];
}) {
  if (reestimations.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
        Переоценки
      </div>
      <ul className="space-y-2 text-sm">
        {reestimations.map((ev, idx) => {
          const authorId = ev.createdBy?.id;
          const developer = authorId ? developerMap.get(authorId) : undefined;
          const authorName = developer?.name || ev.createdBy?.display || 'Неизвестно';
          return (
            <li key={`${ev.updatedAt}-${idx}`} className="flex justify-between gap-2">
              <span className="font-medium text-amber-800 dark:text-amber-200">{ev.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 text-right">
                {authorName} · {formatFactPhaseDateTime(ev.updatedAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
