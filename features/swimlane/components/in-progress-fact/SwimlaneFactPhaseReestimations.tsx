'use client';

import type { PhaseReestimationEvent } from './SwimlaneFactPhaseTooltipHelpers';
import type { Developer } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_DIVIDER_COLOR } from '@/features/context-menu/contextMenuClasses';

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
    <div className={`border-t px-3 py-2.5 ${CONTEXT_MENU_DIVIDER_COLOR}`}>
      <div className="mb-1.5 text-xs text-ds-text-muted">
        {t('sprintPlanner.swimlane.factTimeline.reestimates')}
      </div>
      <ul className="space-y-1.5 text-xs">
        {reestimations.map((ev, idx) => {
          const authorId = ev.createdBy?.id;
          const developer = authorId ? developerMap.get(authorId) : undefined;
          const authorName = developer?.name || ev.createdBy?.display || unknownAuthor;
          return (
            <li key={`${ev.updatedAt}-${idx}`} className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-amber-800 dark:text-amber-200">{ev.label}</span>
              <span className="shrink-0 text-right text-[11px] tabular-nums text-ds-text-muted">
                {authorName} · {formatFactPhaseDateTime(ev.updatedAt, dateLocale)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
