'use client';

import type { BeerLottieRef } from '@/components/BeerLottie';

import { useRef } from 'react';

import { BeerLottie } from '@/components/BeerLottie';
import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

interface BeerTrackerLogoButtonProps {
  /** Подпись рядом с кружкой; по умолчанию `header.appName`. */
  label?: string;
  lottieSize?: number;
}

/**
 * Кнопка бренда в шапке: Lottie-кружка + Caveat-название, клик запускает анимацию.
 */
export function BeerTrackerLogoButton({ label, lottieSize }: BeerTrackerLogoButtonProps) {
  const { t } = useI18n();
  const beerLottieRef = useRef<BeerLottieRef>(null);
  const title = label ?? t('header.appName');

  return (
    <Button
      aria-label={t('header.clickForAnimation')}
      className="h-auto min-h-0 gap-1 border-0 bg-transparent p-0 pr-2 text-left shadow-none hover:bg-transparent dark:hover:bg-transparent"
      type="button"
      variant="ghost"
      onClick={() => beerLottieRef.current?.play()}
    >
      <BeerLottie ref={beerLottieRef} size={lottieSize} />
      <span
        className="whitespace-nowrap text-2xl font-bold text-gray-900 dark:text-gray-100"
        style={{
          fontFamily: 'var(--font-caveat), cursive',
          fontWeight: 700,
          letterSpacing: '0.02em',
          transform: 'rotate(-1deg)',
        }}
      >
        {title}
      </span>
    </Button>
  );
}
