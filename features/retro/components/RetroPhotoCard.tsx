'use client';

import type { RetroVisibleCard } from '@/lib/retro/retroBoard';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  getPhotoCardPaddingClass,
  getPhotoCardStyle,
  getPhotoCardWellClass,
} from '@/features/task/utils/photoCardSurface';
import { useThemeStorage } from '@/hooks/useLocalStorage';

import { RetroCardComments } from './RetroCardComments';
import { retroIconButtonClass } from './retroUi';

interface RetroPhotoCardProps {
  card: RetroVisibleCard;
  onAddComment?: (ownerSprintId: number, cardId: string, text: string, authorName: string) => void;
  onDelete: (cardId: string) => void;
  onDeleteComment?: (ownerSprintId: number, cardId: string, commentId: string) => void;
}

export function RetroPhotoCard({
  card,
  onAddComment,
  onDelete,
  onDeleteComment,
}: RetroPhotoCardProps) {
  const { t } = useI18n();
  const [theme] = useThemeStorage();
  if (!card.imageDataUrl) return null;

  return (
    <article
      className="group relative mx-2 overflow-hidden rounded-lg"
      style={{ ...getPhotoCardStyle(theme === 'dark'), borderRadius: 8 }}
    >
      <div className={getPhotoCardPaddingClass()}>
        <div className={`${getPhotoCardWellClass()} h-36`}>
          {/* Local retro images are data URLs kept in this browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={t('retro.imageAlt')}
            className="h-full w-full object-contain"
            src={card.imageDataUrl}
          />
        </div>
      </div>
      <button
        aria-label={t('retro.deleteCard')}
        className={`${retroIconButtonClass} absolute right-1 top-1 bg-white/80 opacity-0 group-hover:opacity-100 dark:bg-black/40`}
        type="button"
        onClick={() => onDelete(card.id)}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
      </button>
      {onAddComment && onDeleteComment ? (
        <div className="flex justify-end px-1.5 pb-1.5">
          <RetroCardComments
            comments={card.comments}
            onAdd={(text, authorName) => onAddComment(card.ownerSprintId, card.id, text, authorName)}
            onDelete={(commentId) => onDeleteComment(card.ownerSprintId, card.id, commentId)}
          />
        </div>
      ) : null}
    </article>
  );
}
