'use client';

import { Fragment, type ReactNode } from 'react';

import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { splitStickyNoteTextByIssueKeys } from '@/lib/comments/stickyNoteIssueKeys';
import { splitStickyNoteTextByUrls } from '@/lib/comments/stickyNoteLinks';
import { issueTrackerIssueWebUrlFromBase } from '@/lib/issueTrackerProvider/issueTrackerUi';

/** На цветном пузыре — белое подчёркивание, на обычном фоне — синяя ссылка. */
const LINK_CLASS = {
  bubble:
    'cursor-pointer font-medium underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white',
  plain:
    'cursor-pointer font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:decoration-blue-400',
} as const;

type LinkSurface = keyof typeof LINK_CLASS;

function renderLink(label: string, href: string, key: string, surface: LinkSurface): ReactNode {
  return (
    <a key={key} className={LINK_CLASS[surface]} href={href} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}

function renderIssueKeys(
  value: string,
  keyPrefix: string,
  issueHref: ((key: string) => string) | null,
  surface: LinkSurface
): ReactNode {
  if (!issueHref) {
    return value;
  }
  return splitStickyNoteTextByIssueKeys(value).map((segment, index) =>
    segment.type === 'text' ? (
      <Fragment key={`${keyPrefix}-${index}`}>{segment.value}</Fragment>
    ) : (
      renderLink(segment.key, issueHref(segment.key), `${keyPrefix}-${index}`, surface)
    )
  );
}

/** Текст реплики в чате с агентом: ключи задач ведут в трекер, голые URL — кликабельны. */
export function AgentMessageText({ surface = 'bubble', text }: { surface?: LinkSurface; text: string }) {
  const { kind, webBaseUrl } = useTrackerWebUrlContext();
  const issueHref = webBaseUrl.trim()
    ? (issueKey: string) => issueTrackerIssueWebUrlFromBase(kind, webBaseUrl, issueKey)
    : null;

  return (
    <>
      {splitStickyNoteTextByUrls(text).map((segment, index) =>
        segment.type === 'url' ? (
          renderLink(segment.raw, segment.href, `url-${index}`, surface)
        ) : (
          <Fragment key={`text-${index}`}>{renderIssueKeys(segment.value, `text-${index}`, issueHref, surface)}</Fragment>
        )
      )}
    </>
  );
}
