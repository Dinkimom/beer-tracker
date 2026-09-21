'use client';

import type { Developer } from '@/types';
import type { RefObject } from 'react';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Avatar } from '@/components/Avatar';
import { ZIndex } from '@/constants';
import { getInitials } from '@/utils/displayUtils';

interface CommentMentionSelectorProps {
  activeIndex: number;
  anchorRef: RefObject<HTMLTextAreaElement | null>;
  candidates: readonly Developer[];
  onSelect: (developer: Developer) => void;
}

interface MentionSelectorPosition {
  left: number;
  top: number;
  width: number;
}

function resolveMentionSelectorPosition(
  anchor: HTMLTextAreaElement | null
): MentionSelectorPosition | null {
  if (!anchor) {
    return null;
  }
  const rect = anchor.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.bottom + 4,
    width: rect.width,
  };
}

export function CommentMentionSelector({
  activeIndex,
  anchorRef,
  candidates,
  onSelect,
}: CommentMentionSelectorProps) {
  const [position, setPosition] = useState<MentionSelectorPosition | null>(null);

  useLayoutEffect(() => {
    setPosition(resolveMentionSelectorPosition(anchorRef.current));
  }, [activeIndex, anchorRef, candidates]);

  if (typeof document === 'undefined' || !position) {
    return null;
  }

  return createPortal(
    <div
      className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
      style={{
        left: position.left,
        position: 'fixed',
        top: position.top,
        width: position.width,
        zIndex: ZIndex.popupContent + 10,
      }}
    >
      <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
        {candidates.map((developer, index) => (
          <li key={developer.id} role="option">
            <button
              aria-selected={index === activeIndex}
              className={[
                'flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left text-sm text-gray-900 dark:text-gray-100',
                index === activeIndex
                  ? 'bg-blue-50 dark:bg-blue-500/15'
                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
              ].join(' ')}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(developer);
              }}
            >
              <Avatar
                avatarUrl={developer.avatarUrl}
                initials={getInitials(developer.name)}
                initialsVariant="primary"
                size="sm"
                title={developer.name}
              />
              <span className="min-w-0 truncate">{developer.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}
