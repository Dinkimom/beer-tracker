'use client';

import { Fragment, type ReactNode } from 'react';

import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { StickyNoteLinkBadge } from '@/features/comments/components/StickyNoteLinkBadge';
import { StickyNoteMentionBadge } from '@/features/comments/components/StickyNoteMentionBadge';
import { parseStickyNoteInlineFormat, type StickyNoteInlineNode } from '@/lib/comments/stickyNoteInlineFormat';
import { splitStickyNoteTextByIssueKeys } from '@/lib/comments/stickyNoteIssueKeys';
import { splitStickyNoteTextByUrls } from '@/lib/comments/stickyNoteLinks';
import { splitStickyNoteTextByMentions } from '@/lib/comments/stickyNoteMentions';
import { issueTrackerIssueWebUrlFromBase } from '@/lib/issueTrackerProvider/issueTrackerUi';

interface StickyNoteTextContentProps {
  isDragging: boolean;
  text: string;
}

function renderPlainOrIssueKeys(
  value: string,
  isDragging: boolean,
  keyPrefix: string,
  issueHrefForKey: ((issueKey: string) => string) | null
): ReactNode {
  if (!issueHrefForKey) {
    return value;
  }
  const keySegments = splitStickyNoteTextByIssueKeys(value);
  if (!keySegments.some((segment) => segment.type === 'issueKey')) {
    return value;
  }
  return keySegments.map((segment, index) => {
    if (segment.type === 'text') {
      return <Fragment key={`${keyPrefix}-text-${index}`}>{segment.value}</Fragment>;
    }
    const href = issueHrefForKey(segment.key);
    if (!href) {
      return <Fragment key={`${keyPrefix}-key-plain-${index}`}>{segment.key}</Fragment>;
    }
    return (
      <StickyNoteLinkBadge
        key={`${keyPrefix}-key-${segment.key}-${index}`}
        href={href}
        isDragging={isDragging}
      />
    );
  });
}

function renderTextSegment(
  value: string,
  isDragging: boolean,
  keyPrefix: string,
  issueHrefForKey: ((issueKey: string) => string) | null
): ReactNode {
  const urlSegments = splitStickyNoteTextByUrls(value);
  if (!urlSegments.some((segment) => segment.type === 'url')) {
    return renderPlainOrIssueKeys(value, isDragging, keyPrefix, issueHrefForKey);
  }
  return urlSegments.map((segment, index) => {
    if (segment.type === 'text') {
      return (
        <Fragment key={`${keyPrefix}-urltext-${index}`}>
          {renderPlainOrIssueKeys(
            segment.value,
            isDragging,
            `${keyPrefix}-urltext-${index}`,
            issueHrefForKey
          )}
        </Fragment>
      );
    }
    return (
      <StickyNoteLinkBadge
        key={`${keyPrefix}-url-${segment.href}-${index}`}
        href={segment.href}
        isDragging={isDragging}
      />
    );
  });
}

function renderMentionsAndLinks(
  text: string,
  isDragging: boolean,
  keyPrefix: string,
  issueHrefForKey: ((issueKey: string) => string) | null
): ReactNode {
  const segments = splitStickyNoteTextByMentions(text);
  const hasRichSegments = segments.some((segment) => segment.type === 'mention');
  if (!hasRichSegments) {
    return renderTextSegment(text, isDragging, keyPrefix, issueHrefForKey);
  }

  return segments.map((segment, index) => {
    if (segment.type === 'mention') {
      return (
        <StickyNoteMentionBadge
          key={`${keyPrefix}-mention-${segment.id}-${index}`}
          isDragging={isDragging}
          name={segment.name}
        />
      );
    }
    return (
      <Fragment key={`${keyPrefix}-text-${index}`}>
        {renderTextSegment(segment.value, isDragging, `${keyPrefix}-segment-${index}`, issueHrefForKey)}
      </Fragment>
    );
  });
}

function renderInlineNodes(
  nodes: readonly StickyNoteInlineNode[],
  isDragging: boolean,
  keyPrefix: string,
  issueHrefForKey: ((issueKey: string) => string) | null
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === 'text') {
      return (
        <Fragment key={key}>
          {renderMentionsAndLinks(node.value, isDragging, key, issueHrefForKey)}
        </Fragment>
      );
    }
    if (node.type === 'code') {
      return (
        <code
          key={key}
          className="rounded-sm bg-black/[0.06] px-0.5 font-mono text-[0.92em] dark:bg-white/10"
        >
          {node.value}
        </code>
      );
    }
    const children = renderInlineNodes(node.children, isDragging, key, issueHrefForKey);
    if (node.type === 'bold') {
      return (
        <strong key={key} className="font-bold">
          {children}
        </strong>
      );
    }
    if (node.type === 'italic') {
      return <em key={key}>{children}</em>;
    }
    return <s key={key}>{children}</s>;
  });
}

export function StickyNoteTextContent({ isDragging, text }: StickyNoteTextContentProps) {
  const { kind, webBaseUrl } = useTrackerWebUrlContext();
  const issueHrefForKey =
    webBaseUrl.trim().length > 0
      ? (issueKey: string) => issueTrackerIssueWebUrlFromBase(kind, webBaseUrl, issueKey)
      : null;

  const nodes = parseStickyNoteInlineFormat(text);
  if (nodes.every((node) => node.type === 'text')) {
    return renderMentionsAndLinks(text, isDragging, 'plain', issueHrefForKey);
  }

  return <>{renderInlineNodes(nodes, isDragging, 'inline', issueHrefForKey)}</>;
}
