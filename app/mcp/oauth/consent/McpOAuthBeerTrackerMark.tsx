const BEER_MUG_SRC = '/assets/icons/beer-mug.svg';

export function McpOAuthBeerTrackerMark({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 shadow-lg ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:ring-amber-700/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG; img isolates gradient IDs */}
      <img
        alt=""
        aria-hidden
        className="h-10 w-10 select-none object-contain"
        draggable={false}
        height={40}
        src={BEER_MUG_SRC}
        width={40}
      />
    </span>
  );
}
