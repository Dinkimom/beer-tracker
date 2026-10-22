'use client';

import type { Developer } from '@/types';
import type { IssueComment } from '@/types/tracker';

import ReactMarkdown from 'react-markdown';

import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_DIVIDER_COLOR } from '@/features/context-menu/contextMenuClasses';
import { getInitials } from '@/utils/displayUtils';

import {
  factTimelineDateLocale,
  formatFactPhaseDateTime,
} from './SwimlaneFactPhaseTooltipHelpers';

export function SwimlaneFactPhaseComments({
  comments,
  developerMap,
}: {
  comments: IssueComment[];
  developerMap: Map<string, Developer>;
}) {
  const { language, t } = useI18n();
  const dateLocale = factTimelineDateLocale(language);
  const unknownAuthor = t('sprintPlanner.swimlane.factTimeline.unknownAuthor');

  if (comments.length === 0) return null;

  return (
    <div className={`border-t px-3 py-2.5 ${CONTEXT_MENU_DIVIDER_COLOR}`}>
      <div className="mb-1.5 text-xs text-ds-text-muted">
        {t('sprintPlanner.swimlane.factTimeline.comments')}
      </div>
      <ul className="space-y-2.5">
        {comments.map((comment) => {
          const authorId = comment.createdBy.id;
          const developer = developerMap.get(authorId);
          const authorName = developer?.name || comment.createdBy.display || unknownAuthor;
          return (
            <li
              key={`${comment.id}-${comment.createdAt}`}
              className={`border-t pt-2 first:border-t-0 first:pt-0 ${CONTEXT_MENU_DIVIDER_COLOR}`}
            >
              <div className="flex items-start gap-2 mb-1">
                <Avatar
                  avatarUrl={developer?.avatarUrl}
                  initials={getInitials(authorName)}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {authorName}
                    </span>
                    <span className="text-[11px] tabular-nums text-ds-text-muted">
                      {formatFactPhaseDateTime(comment.createdAt, dateLocale)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none mt-1 [&_p]:my-0 [&_a]:break-all">
                    <ReactMarkdown>{comment.text || ''}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
