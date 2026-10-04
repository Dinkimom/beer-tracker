export function RetroFactsMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">{label}</span>
      <span className="shrink-0 text-right font-medium tabular-nums text-gray-800 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
