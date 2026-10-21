interface PhotoCardImageProps {
  alt?: string;
  className?: string;
  lazy?: boolean;
  src: string;
}

/**
 * Фото целиком (contain) поверх размытой копии во весь колодец: без чёрных полос и без обрезки.
 */
export function PhotoCardImage({ alt = '', className = '', lazy = false, src }: PhotoCardImageProps) {
  const loading = lazy ? 'lazy' : undefined;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-md saturate-125"
        decoding="async"
        loading={loading}
        src={src}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className={`relative h-full w-full object-contain ${className}`}
        decoding="async"
        fetchPriority={lazy ? 'low' : undefined}
        loading={loading}
        src={src}
      />
    </>
  );
}
