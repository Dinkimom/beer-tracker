'use client';

interface ToggleProps {
  checked: boolean;
  /** Акцент дорожки: `violet` — как в планере; по умолчанию синий (настройки). */
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
      : 'focus:ring-blue-500';
  const trackOn = colorScheme === 'violet' ? 'bg-violet-600 dark:bg-violet-500' : 'bg-blue-600';

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          htmlFor={id}
        >
          {label}
        </label>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">{hint}</p>
        )}
      </div>
      <button
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${focusRing} ${
          checked ? trackOn : 'bg-gray-200 dark:bg-gray-600'
        }`}
        id={id}
        role="switch"
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
