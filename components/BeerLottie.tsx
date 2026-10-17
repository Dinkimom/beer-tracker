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
const BEER_EMOJI_JSON_URL = '/assets/beer-emoji.json';
const BEER_MUG_FALLBACK_SRC = '/assets/icons/beer-mug.svg';

function isLottiePlayer(value: unknown): value is LottiePlayer {
  if (typeof value === 'function') {
    return true;
  }
  // forwardRef / memo — object with $$typeof, not a plain function
  return typeof value === 'object' && value != null && '$$typeof' in value;
}

function resolveLottiePlayer(mod: { default?: unknown }): LottiePlayer | null {
  if (isLottiePlayer(mod.default)) {
    return mod.default;
  }
  if (
    mod.default != null &&
    typeof mod.default === 'object' &&
    'default' in mod.default &&
    isLottiePlayer((mod.default as { default: unknown }).default)
  ) {
    return (mod.default as { default: LottiePlayer }).default;
  }
  return null;
}

export const BeerLottie = forwardRef<BeerLottieRef, BeerLottieProps>(function BeerLottie(
  { autoplay = false, className, loop = false, size = DEFAULT_SIZE },
  ref
) {
  const lottieRef = useRef<LottiePlayerHandle | null>(null);
  const [Lottie, setLottie] = useState<LottiePlayer | null>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('lottie-react'),
      fetch(BEER_EMOJI_JSON_URL).then((response) => {
        if (!response.ok) {
          throw new Error(`BeerLottie: failed to load ${BEER_EMOJI_JSON_URL}`);
        }
        return response.json() as Promise<object>;
      }),
    ])
      .then(([lottieMod, data]) => {
        if (cancelled) {
          return;
        }
        const player = resolveLottiePlayer(lottieMod);
        if (!player) {
          return;
        }
        setLottie(() => player);
        setAnimationData(data);
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

  const ready = Lottie != null && animationData != null;

  return (
    <span
      aria-hidden
      className={`flex items-center justify-center select-none ${className ?? ''}`}
      style={{ height: size, width: size }}
    >
      {ready ? (
        <Lottie
          animationData={animationData}
          autoplay={autoplay}
          loop={loop}
          lottieRef={lottieRef}
          style={{ height: size, width: size }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static fallback while Lottie loads (Storybook + first paint)
        <img
          alt=""
          className="select-none object-contain"
          draggable={false}
          height={size}
          src={BEER_MUG_FALLBACK_SRC}
          width={size}
        />
      )}
    </span>
  );
});
