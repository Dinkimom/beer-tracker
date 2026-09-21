'use client';

interface SlaBugSignalTagTooltipMetricCellProps {
  label: string;
  value: string;
  valueClassName?: string;
}

export function SlaBugSignalTagTooltipMetricCell({
  label,
  value,
  valueClassName = '',
}: SlaBugSignalTagTooltipMetricCellProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50 ${valueClassName}`}
      >
        {value}
      </dd>
    </div>
  );
}
