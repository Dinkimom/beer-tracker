'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface BeerLottieRef {
  play: () => void;
}

interface BeerLottieProps {
  autoplay?: boolean;
  className?: string;
  loop?: boolean;
  size?: number;
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

const DEFAULT_SIZE = 32;

export const BeerLottie = forwardRef<BeerLottieRef, BeerLottieProps>(function BeerLottie(
  { autoplay = false, className, loop = false, size = DEFAULT_SIZE },
  ref
) {
  const lottieRef = useRef<LottiePlayerHandle | null>(null);
  const [Lottie, setLottie] = useState<LottiePlayer | null>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('lottie-react'), import('@/public/assets/beer-emoji.json')])
      .then(([lottieMod, jsonMod]) => {
        if (cancelled) {
          return;
        }
        setLottie(() => lottieMod.default as LottiePlayer);
        setAnimationData(jsonMod.default as object);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const play = useCallback(() => {
    lottieRef.current?.goToAndPlay(0, true);
  }, []);

  useImperativeHandle(ref, () => ({ play }), [play]);

  return (
    <span
      aria-hidden
      className={`flex items-center justify-center select-none ${className ?? ''}`}
      style={{ height: size, width: size }}
    >
      {Lottie && animationData ? (
        <Lottie
          animationData={animationData}
          autoplay={autoplay}
          loop={loop}
          lottieRef={lottieRef}
          style={{ height: size, width: size }}
        />
      ) : null}
    </span>
  );
});
