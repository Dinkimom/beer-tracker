'use client';

import { BeerLottie } from './BeerLottie';

const BEER_SIZE = 64;

/** Анимированное эмодзи пива из логотипа вместо спиннера. */
export function LoadingOverlayBeerIcon() {
  return (
    <div aria-hidden>
      <BeerLottie autoplay loop size={BEER_SIZE} />
    </div>
  );
}
