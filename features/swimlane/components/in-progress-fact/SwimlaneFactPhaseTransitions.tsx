'use client';

import type { PhaseStatusTransition } from './SwimlaneFactPhaseTooltipHelpers';
import type { Developer } from '@/types';

import { Avatar } from '@/components/Avatar';
import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

import {
  factTimelineDateLocale,
  formatFactPhaseDateTime,
} from './SwimlaneFactPhaseTooltipHelpers';

export function SwimlaneFactPhaseTransitions({
  developerMap,
  transitions,
}: {
  developerMap: Map<string, Developer>;
  transitions: PhaseStatusTransition[];
}) {
  const { language, t } = useI18n();
  const dateLocale = factTimelineDateLocale(language);
  const unknownAuthor = t('sprintPlanner.swimlane.factTimeline.unknownAuthor');

  if (transitions.length === 0) return null;

  return (
    <div className="mb-3 space-y-3">
      {transitions.map((transition, idx) => {
        const author = transition.entry.createdBy;
        const authorId = author?.id;
        const developer = authorId ? developerMap.get(authorId) : undefined;
        const authorName = developer?.name || author?.display || unknownAuthor;

        return (
          <div key={idx} className="flex items-start gap-2">
            <Avatar
              avatarUrl={developer?.avatarUrl}
              initials={getInitials(authorName)}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {authorName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {formatFactPhaseDateTime(transition.timestamp, dateLocale)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {transition.fromStatusKey ? (
                  <>
                    <StatusTag
                      label={transition.fromStatusName ?? undefined}
                      status={transition.fromStatusKey}
                    />
                    <span className="text-gray-400 dark:text-gray-500">→</span>
                  </>
                ) : null}
                <StatusTag label={transition.toStatusName} status={transition.toStatusKey} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
