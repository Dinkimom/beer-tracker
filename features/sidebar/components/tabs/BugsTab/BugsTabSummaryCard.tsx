'use client';

interface BugsTabSummaryCardProps {
  subtitle: string;
  title: string;
  value: number;
}

export function BugsTabSummaryCard({ subtitle, title, value }: BugsTabSummaryCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50/60 px-2.5 py-2 dark:border-gray-600 dark:bg-gray-900/35">
      <p className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums leading-none text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}
