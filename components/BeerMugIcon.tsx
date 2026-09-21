'use client';

const BEER_MUG_COLOR_SRC = '/assets/icons/beer-mug.svg';
const BEER_MUG_SOLID_MASK_SRC = '/assets/icons/beer-mug-solid.svg';

const BEER_MUG_SIZE_PX = {
  lg: 36,
  md: 30,
  sm: 20,
} as const;

export function BeerMugIcon({
  className,
  size = 'md',
  tone,
}: {
  className?: string;
  size?: 'lg' | 'md' | 'sm';
  tone: 'color' | 'solid';
}) {
  const px = BEER_MUG_SIZE_PX[size];

  if (tone === 'solid') {
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 bg-gray-300 dark:bg-gray-500 ${className ?? ''}`}
        style={{
          width: px,
          height: px,
          WebkitMaskImage: `url(${BEER_MUG_SOLID_MASK_SRC})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${BEER_MUG_SOLID_MASK_SRC})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG asset; img isolates gradient IDs across many instances
    <img
      alt=""
      aria-hidden
      className={`inline-block shrink-0 select-none object-contain ${className ?? ''}`}
      draggable={false}
      height={px}
      src={BEER_MUG_COLOR_SRC}
      width={px}
    />
  );
}
