'use client';

import { ToggleTrack } from '@/components/ToggleTrack';

interface ToggleProps {
  checked: boolean;
  /** Акцент дорожки: `violet` — редкий акцент занятости; по умолчанию тихий blue как у вкладок шапки. */
  colorScheme?: 'blue' | 'violet';
  hint?: string;
  id: string;
  label: string;
  onChange: (next: boolean) => void;
}

export function Toggle({
  checked,
  colorScheme = 'blue',
  id,
  label,
  onChange,
  hint,
}: ToggleProps) {
  const focusRing =
    colorScheme === 'violet'
      ? 'focus:ring-violet-500 dark:focus:ring-violet-400'
      : 'focus:ring-blue-500 dark:focus:ring-blue-400';

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label
          className="block cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
          htmlFor={id}
        >
          {label}
        </label>
        {hint && (
          <p className="mt-1 text-xs leading-snug text-ds-text-muted">{hint}</p>
        )}
      </div>
      <button
        aria-checked={checked}
        className={`inline-flex flex-shrink-0 cursor-pointer rounded-full transition-all duration-200 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] dark:focus:ring-offset-gray-900 ${focusRing}`}
        id={id}
        role="switch"
        type="button"
        onClick={() => onChange(!checked)}
      >
        <ToggleTrack checked={checked} colorScheme={colorScheme} />
      </button>
    </div>
  );
}
