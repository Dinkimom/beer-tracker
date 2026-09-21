'use client';

/**
 * Блокирует клики по доске, пока открыт тулбар/пикер реакций.
 */

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

interface StickyNoteReactionBackdropProps {
  onClose: () => void;
}

export function StickyNoteReactionBackdrop({ onClose }: StickyNoteReactionBackdropProps) {
  const { t } = useI18n();

  return (
    <button
      aria-label={t('comments.reactionBackdropAria')}
      className="pointer-events-auto fixed inset-0 cursor-default bg-transparent"
      style={{ zIndex: ZIndex.contextMenu }}
      type="button"
      onClick={onClose}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    />
  );
}
