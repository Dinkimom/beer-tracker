'use client';

import type { PhaseReestimationEvent } from './SwimlaneFactPhaseTooltipHelpers';
import type { Developer } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';

import {
  factTimelineDateLocale,
  formatFactPhaseDateTime,
} from './SwimlaneFactPhaseTooltipHelpers';

export function SwimlaneFactPhaseReestimations({
  developerMap,
  reestimations,
}: {
  developerMap: Map<string, Developer>;
  reestimations: PhaseReestimationEvent[];
}) {
  const { language, t } = useI18n();
  const dateLocale = factTimelineDateLocale(language);
  const unknownAuthor = t('sprintPlanner.swimlane.factTimeline.unknownAuthor');

  if (reestimations.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
        {t('sprintPlanner.swimlane.factTimeline.reestimates')}
      </div>
      <ul className="space-y-2 text-sm">
        {reestimations.map((ev, idx) => {
          const authorId = ev.createdBy?.id;
          const developer = authorId ? developerMap.get(authorId) : undefined;
          const authorName = developer?.name || ev.createdBy?.display || unknownAuthor;
          return (
            <li key={`${ev.updatedAt}-${idx}`} className="flex justify-between gap-2">
              <span className="font-medium text-amber-800 dark:text-amber-200">{ev.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 text-right">
                {authorName} · {formatFactPhaseDateTime(ev.updatedAt, dateLocale)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
