'use client';

import type { WesternZodiacId } from '@/lib/releaseHoroscope/zodiacFromBirthdate';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface ReleaseHoroscopeZodiacIconRef {
  play: () => void;
}

interface LottiePlayerHandle {
  goToAndPlay: (value: number, isFrame?: boolean) => void;
}

interface LottiePlayerProps {
  animationData: object;
  autoplay?: boolean;
  loop?: boolean;
  lottieRef?: { current: LottiePlayerHandle | null };
  style?: { height: number; width: number };
}

type LottiePlayer = (props: LottiePlayerProps) => React.ReactNode;

interface ZodiacLottieModule {
  default: object;
}

const ZODIAC_LOTTIE: Record<WesternZodiacId, () => Promise<ZodiacLottieModule>> = {
  aquarius: () => import('./zodiacLottie/aquarius.json'),
  aries: () => import('./zodiacLottie/aries.json'),
  cancer: () => import('./zodiacLottie/cancer.json'),
  capricorn: () => import('./zodiacLottie/capricorn.json'),
  gemini: () => import('./zodiacLottie/gemini.json'),
  leo: () => import('./zodiacLottie/leo.json'),
  libra: () => import('./zodiacLottie/libra.json'),
  pisces: () => import('./zodiacLottie/pisces.json'),
  sagittarius: () => import('./zodiacLottie/sagittarius.json'),
  scorpio: () => import('./zodiacLottie/scorpio.json'),
  taurus: () => import('./zodiacLottie/taurus.json'),
  virgo: () => import('./zodiacLottie/virgo.json'),
};

/** Чуть меньше высоты чипа: глиф Noto сидит внутри квадрата 1024 с полями. */
const ICON_SIZE = 22;

/** Анимированный знак из Noto Emoji Animation (Lottie). Крутится один раз по `play()`. */
export const ReleaseHoroscopeZodiacIcon = forwardRef<
  ReleaseHoroscopeZodiacIconRef,
  { signId: WesternZodiacId }
>(function ReleaseHoroscopeZodiacIcon({ signId }, ref) {
  const lottieRef = useRef<LottiePlayerHandle | null>(null);
  const [Lottie, setLottie] = useState<LottiePlayer | null>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('lottie-react'), ZODIAC_LOTTIE[signId]()])
      .then(([lottieMod, jsonMod]) => {
        if (cancelled) return;
        setLottie(() => lottieMod.default as LottiePlayer);
        setAnimationData(jsonMod.default);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signId]);

  const play = useCallback(() => {
    lottieRef.current?.goToAndPlay(0, true);
  }, []);

  useImperativeHandle(ref, () => ({ play }), [play]);

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ height: ICON_SIZE, width: ICON_SIZE }}
    >
      {Lottie && animationData ? (
        <Lottie
          animationData={animationData}
          autoplay={false}
          loop={false}
          lottieRef={lottieRef}
          style={{ height: ICON_SIZE, width: ICON_SIZE }}
        />
      ) : null}
    </span>
  );
});
