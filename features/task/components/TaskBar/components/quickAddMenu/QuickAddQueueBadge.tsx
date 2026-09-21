const QUEUE_BADGE_BG = [
  'bg-violet-600',
  'bg-pink-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-700',
  'bg-indigo-600',
] as const;

function queueBadgeBgClass(queueKey: string): string {
  let hash = 0;
  for (let i = 0; i < queueKey.length; i += 1) {
    hash = (hash + queueKey.charCodeAt(i)) % QUEUE_BADGE_BG.length;
  }
  return QUEUE_BADGE_BG[hash] ?? QUEUE_BADGE_BG[0];
}

export function QuickAddQueueBadge({
  className = '',
  queueKey,
}: {
  className?: string;
  queueKey: string;
}) {
  const initials = queueKey.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${queueBadgeBgClass(queueKey)} ${className}`}
    >
      {initials}
    </span>
  );
}
