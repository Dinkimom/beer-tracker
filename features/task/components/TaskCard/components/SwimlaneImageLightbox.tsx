'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getPhotoCardCaptionColor } from '@/features/task/utils/photoCardSurface';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

interface SwimlaneImageLightboxProps {
  authorName?: string;
  caption?: string;
  src: string;
  onClose: () => void;
}

export function SwimlaneImageLightbox({ authorName, caption, src, onClose }: SwimlaneImageLightboxProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const author = authorName?.trim();
  const captionColor = getPhotoCardCaptionColor(isDark);
  const captionText = caption?.trim();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      aria-modal="true"
      className={`fixed inset-0 flex flex-col items-center justify-center bg-black/85 p-4 sm:p-6 ${ZIndex.class('modalBackdrop')}`}
      role="dialog"
      onClick={onClose}
    >
      <Button
        aria-label={t('sprintPlanner.swimlane.quickAddMenu.imageLightboxClose')}
        className="absolute right-4 top-4 !h-9 !w-9 !min-h-0 !min-w-0 !rounded-full !border-0 !bg-white/10 !p-0 text-white hover:!bg-white/20"
        type="button"
        variant="ghost"
        onClick={onClose}
      >
        <Icon className="h-5 w-5" name="close" size="sm" />
      </Button>
      <div
        className={`flex max-h-full w-full max-w-[95vw] flex-col items-center ${ZIndex.class('modal')}`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={captionText || t('sprintPlanner.swimlane.quickAddMenu.imageEmptySlot')}
          className="max-h-[calc(100vh-7rem)] w-auto max-w-full object-contain"
          src={src}
        />
        {captionText || author ? (
          <div className="mt-4 max-w-2xl px-2 text-center font-sans">
            {captionText ? (
              <p className="text-sm leading-snug sm:text-base" style={{ color: captionColor }}>
                {captionText}
              </p>
            ) : null}
            {author ? (
              <p
                aria-label={t('comments.authorAria', { name: author })}
                className={`${captionText ? 'mt-1' : ''} text-xs leading-snug sm:text-sm`}
                style={{ color: captionColor, opacity: 0.75 }}
              >
                {author}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
