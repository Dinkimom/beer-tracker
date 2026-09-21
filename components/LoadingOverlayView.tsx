'use client';

import { ZIndex } from '@/constants';

import { LoadingOverlayBeerIcon } from './LoadingOverlayBeerIcon';

interface LoadingOverlayViewProps {
  message: string;
}

/** Текст оверлея без конечных точек — их рисует CSS-анимация. */
export function loadingOverlayLabel(message: string): string {
  const trimmed = message.trimEnd();
  let end = trimmed.length;
  while (end > 0) {
    const char = trimmed[end - 1];
    if (char !== '.' && char !== '…') {
      break;
    }
    end -= 1;
  }
  return trimmed.slice(0, end).trimEnd();
}

/** Полноэкранный оверлей загрузки: эмодзи пива и текст. */
export function LoadingOverlayView({ message }: LoadingOverlayViewProps) {
  const label = loadingOverlayLabel(message);
  return (
    <div
      aria-busy="true"
      aria-label={message}
      aria-live="polite"
      className="fixed inset-0 isolate flex items-center justify-center bg-white dark:bg-gray-900"
      role="status"
      style={{ zIndex: ZIndex.overlay }}
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-md px-8">
        <LoadingOverlayBeerIcon />
        <div
          aria-hidden
          className="text-lg font-medium text-gray-700 dark:text-gray-300 text-center"
        >
          <span>{label}</span>
          <span className="loading-overlay-dots">
            <span className="loading-overlay-dots__sizer">...</span>
            <span className="loading-overlay-dots__seq">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
