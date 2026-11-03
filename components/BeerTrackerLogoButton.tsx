'use client';

import type { BeerLottieRef } from '@/components/BeerLottie';

import { useRef } from 'react';

import { BeerLottie, DEFAULT_SIZE as DEFAULT_BEER_LOTTIE_SIZE } from '@/components/BeerLottie';
import { Button } from '@/components/Button';
import { isInChristmasPeriod } from '@/components/christmasLightsHelpers';
import { useI18n } from '@/contexts/LanguageContext';
import { useChristmasThemeStorage } from '@/hooks/useLocalStorage';

interface BeerTrackerLogoButtonProps {
  /** Подпись рядом с кружкой; по умолчанию `header.appName`. */
  label?: string;
  lottieSize?: number;
}

/**
 * Кнопка бренда в шапке: Lottie-кружка + Caveat-название, клик запускает анимацию.
 * В новогодней теме вместо кружки — ёлка.
 */
export function BeerTrackerLogoButton({
  label,
  lottieSize = DEFAULT_BEER_LOTTIE_SIZE,
}: BeerTrackerLogoButtonProps) {
  const { t } = useI18n();
  const [christmasThemeEnabled] = useChristmasThemeStorage();
  const showTree = christmasThemeEnabled && isInChristmasPeriod();
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
      {showTree ? (
        <span
          aria-hidden
          className="flex items-center justify-center leading-none"
          style={{ fontSize: lottieSize * 0.95, height: lottieSize, width: lottieSize }}
        >
          🎄
        </span>
      ) : (
        <BeerLottie ref={beerLottieRef} size={lottieSize} />
      )}
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
