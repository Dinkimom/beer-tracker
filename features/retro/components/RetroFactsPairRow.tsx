import { retroFactsPairGridClass } from './retroUi';

export function RetroFactsPairRow({
  label,
  mean,
  p90,
}: {
  label: string;
  mean: string;
  p90: string;
}) {
  return (
    <div className={`${retroFactsPairGridClass} py-1.5`}>
      <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-gray-800 dark:text-gray-100">{mean}</span>
      <span className="text-right font-medium tabular-nums text-gray-800 dark:text-gray-100">{p90}</span>
    </div>
  );
}
