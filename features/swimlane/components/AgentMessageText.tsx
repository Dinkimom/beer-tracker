'use client';

import { Fragment, type ReactNode } from 'react';

import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { splitStickyNoteTextByIssueKeys } from '@/lib/comments/stickyNoteIssueKeys';
import { splitStickyNoteTextByUrls } from '@/lib/comments/stickyNoteLinks';
import { issueTrackerIssueWebUrlFromBase } from '@/lib/issueTrackerProvider/issueTrackerUi';

const LINK_CLASS =
  'cursor-pointer font-medium underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white';

function renderLink(label: string, href: string, key: string): ReactNode {
  return (
    <a key={key} className={LINK_CLASS} href={href} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}

function renderIssueKeys(value: string, keyPrefix: string, issueHref: ((key: string) => string) | null): ReactNode {
  if (!issueHref) {
    return value;
  }
  return splitStickyNoteTextByIssueKeys(value).map((segment, index) =>
    segment.type === 'text' ? (
      <Fragment key={`${keyPrefix}-${index}`}>{segment.value}</Fragment>
    ) : (
      renderLink(segment.key, issueHref(segment.key), `${keyPrefix}-${index}`)
    )
  );
}

/** Текст реплики в чате с агентом: ключи задач ведут в трекер, голые URL — кликабельны. */
export function AgentMessageText({ text }: { text: string }) {
  const { kind, webBaseUrl } = useTrackerWebUrlContext();
  const issueHref = webBaseUrl.trim()
    ? (issueKey: string) => issueTrackerIssueWebUrlFromBase(kind, webBaseUrl, issueKey)
    : null;

  return (
    <>
      {splitStickyNoteTextByUrls(text).map((segment, index) =>
        segment.type === 'url' ? (
          renderLink(segment.raw, segment.href, `url-${index}`)
        ) : (
          <Fragment key={`text-${index}`}>{renderIssueKeys(segment.value, `text-${index}`, issueHref)}</Fragment>
        )
      )}
    </>
  );
}
