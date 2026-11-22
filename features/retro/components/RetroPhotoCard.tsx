'use client';

import type { RetroVisibleCard } from '@/lib/retro/retroBoard';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { PhotoCardImage } from '@/features/task/components/TaskCard/components/PhotoCardImage';
import {
  getPhotoCardPaddingClass,
  getPhotoCardStyle,
  getPhotoCardWellClass,
} from '@/features/task/utils/photoCardSurface';
import { useThemeStorage } from '@/hooks/useLocalStorage';

import { useRetroCardActions } from '../RetroCardActionsContext';

import { RetroCardComments } from './RetroCardComments';

interface RetroPhotoCardProps {
  card: RetroVisibleCard;
}

export function RetroPhotoCard({ card }: RetroPhotoCardProps) {
  const { t } = useI18n();
  // Без контекста действий (превью перетаскивания) карточка только для чтения.
  const actions = useRetroCardActions();
  const [theme] = useThemeStorage();
  if (!card.imageDataUrl) return null;

  return (
    <article
      className="retro-card-cardboard group relative mx-2 overflow-hidden rounded-lg"
      style={{ ...getPhotoCardStyle(theme === 'dark'), borderRadius: 8 }}
    >
      <div className={getPhotoCardPaddingClass()}>
        <div className={`${getPhotoCardWellClass()} h-36`}>
          {/* Local retro images are data URLs kept in this browser. */}
          <PhotoCardImage alt={t('retro.imageAlt')} src={card.imageDataUrl} />
        </div>
      </div>
      <HeaderIconButton
        aria-label={t('retro.deleteCard')}
        className="absolute right-1 top-1 bg-white/80 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 dark:bg-black/40"
        size="sm"
        onCanvas
        onClick={() => actions?.deleteCard(card)}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
      </HeaderIconButton>
      {actions ? (
        <div className="flex justify-end px-1.5 pb-1.5">
          <RetroCardComments card={card} />
        </div>
      ) : null}
    </article>
  );
}
