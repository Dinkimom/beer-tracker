'use client';

import { Fragment } from 'react';

import { StickyNoteLinkBadge } from '@/features/comments/components/StickyNoteLinkBadge';
import { StickyNoteMentionBadge } from '@/features/comments/components/StickyNoteMentionBadge';
import { splitStickyNoteTextByUrls } from '@/lib/comments/stickyNoteLinks';
import { splitStickyNoteTextByMentions } from '@/lib/comments/stickyNoteMentions';

interface StickyNoteTextContentProps {
  isDragging: boolean;
  text: string;
}

function renderTextSegment(value: string, isDragging: boolean, keyPrefix: string) {
  const urlSegments = splitStickyNoteTextByUrls(value);
  if (!urlSegments.some((segment) => segment.type === 'url')) {
    return value;
  }
  return urlSegments.map((segment, index) => {
    if (segment.type === 'text') {
      return <Fragment key={`${keyPrefix}-text-${index}`}>{segment.value}</Fragment>;
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

export function StickyNoteTextContent({ isDragging, text }: StickyNoteTextContentProps) {
  const segments = splitStickyNoteTextByMentions(text);
  const hasRichSegments = segments.some((segment) => segment.type === 'mention');
  if (!hasRichSegments) {
    return renderTextSegment(text, isDragging, 'plain');
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'mention') {
          return (
            <StickyNoteMentionBadge
              key={`mention-${segment.id}-${index}`}
              isDragging={isDragging}
              name={segment.name}
            />
          );
        }
        return (
          <Fragment key={`text-${index}`}>
            {renderTextSegment(segment.value, isDragging, `segment-${index}`)}
          </Fragment>
        );
      })}
    </>
  );
}
