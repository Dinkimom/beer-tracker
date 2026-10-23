'use client';

interface ToggleTrackProps {
  checked: boolean;
  /** Акцент дорожки: `violet` — редкий акцент занятости; по умолчанию тихий blue как у вкладок шапки. */
  colorScheme?: 'blue' | 'violet';
}

/** Дорожка переключателя без поведения: кнопкой служит родитель (switch, пункт меню). */
export function ToggleTrack({ checked, colorScheme = 'blue' }: ToggleTrackProps) {
  const trackOn =
    colorScheme === 'violet'
      ? 'bg-violet-500 dark:bg-violet-500/90'
      : 'bg-blue-500 dark:bg-blue-500/80';
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? trackOn : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </span>
  );
}
