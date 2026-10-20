'use client';

interface SprintMetricsChartTooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: ReadonlyArray<{ color?: string; dataKey?: unknown; name?: unknown; value?: unknown }>;
  formatValue: (value: number | null) => string;
}

/** Подсказка по спринту: название и значения всех серий, цвет — только у маркера. */
export function SprintMetricsChartTooltip({ active, formatValue, label, payload }: SprintMetricsChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ds-border-subtle bg-white px-3 py-2 text-xs shadow-lg dark:bg-gray-800">
      <div className="mb-1 font-medium text-gray-900 dark:text-gray-100">{label}</div>
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center gap-2 text-ds-text-muted">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="flex-1">{String(item.name ?? '')}</span>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {formatValue(typeof item.value === 'number' ? item.value : null)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
