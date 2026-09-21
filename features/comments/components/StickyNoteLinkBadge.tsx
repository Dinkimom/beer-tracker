'use client';

import { useCallback, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { useStickyNoteLinkPreview } from '@/features/comments/hooks/useStickyNoteLinkPreview';
import { resolveStickyNoteLinkBadgeTitle } from '@/lib/comments/stickyNoteLinkLabel';
import { resolveStickyNoteFaviconSources } from '@/lib/comments/stickyNoteLinks';

const BADGE_CLASS =
  'pointer-events-auto mx-0.5 inline-flex h-[18px] max-w-[16rem] cursor-pointer items-center gap-1 align-middle rounded border border-black/15 bg-white/90 px-1 font-sans text-[10px] font-medium leading-none text-gray-800 hover:border-blue-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-white/20 dark:bg-gray-900/90 dark:text-gray-100 dark:hover:bg-gray-900';

const DRAG_MOVE_THRESHOLD_PX = 5;

interface StickyNoteLinkBadgeProps {
  href: string;
  isDragging: boolean;
}

export function StickyNoteLinkBadge({ href, isDragging }: StickyNoteLinkBadgeProps) {
  const { t } = useI18n();
  const { data } = useStickyNoteLinkPreview(href);
  const [faviconIndex, setFaviconIndex] = useState(0);
  const title = resolveStickyNoteLinkBadgeTitle(href, data?.title);
  const faviconSources = resolveStickyNoteFaviconSources(href, data?.faviconUrl);
  const faviconUrl = faviconSources[faviconIndex] ?? null;
  const dragGuard = useStickyNoteLinkDragGuard(isDragging);

  const handleFaviconError = useCallback(() => {
    setFaviconIndex((current) => current + 1);
  }, []);

  return (
    <TextTooltip content={href} delayDuration={250} side="top" sideOffset={6}>
      <a
        aria-label={t('comments.linkOpenAria', { title })}
        className={BADGE_CLASS}
        href={href}
        rel="noopener noreferrer"
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
        target="_blank"
        onClick={dragGuard.onClick}
        onMouseDown={dragGuard.onMouseDown}
        onMouseMove={dragGuard.onMouseMove}
        onPointerDown={dragGuard.onPointerDown}
      >
        {faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={faviconUrl}
            alt=""
            className="h-3 w-3 shrink-0 rounded-sm"
            draggable={false}
            referrerPolicy="no-referrer"
            src={faviconUrl}
            onError={handleFaviconError}
          />
        ) : (
          <Icon className="h-3 w-3 shrink-0" name="link" />
        )}
        <span className="min-w-0 truncate">{title}</span>
      </a>
    </TextTooltip>
  );
}

function useStickyNoteLinkDragGuard(isDragging: boolean) {
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (isDragging || hasMoved.current) {
        event.preventDefault();
      }
    },
    [isDragging]
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (isDragging) {
        event.preventDefault();
        return;
      }
      mouseDownPos.current = { x: event.clientX, y: event.clientY };
      hasMoved.current = false;
    },
    [isDragging]
  );

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    const origin = mouseDownPos.current;
    if (!origin) {
      return;
    }
    const movedX = Math.abs(event.clientX - origin.x) > DRAG_MOVE_THRESHOLD_PX;
    const movedY = Math.abs(event.clientY - origin.y) > DRAG_MOVE_THRESHOLD_PX;
    if (movedX || movedY) {
      hasMoved.current = true;
    }
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    event.stopPropagation();
  }, []);

  return { onClick, onMouseDown, onMouseMove, onPointerDown };
}
