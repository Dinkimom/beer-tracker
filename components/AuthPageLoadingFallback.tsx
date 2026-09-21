'use client';

import { AuthBackground } from './AuthBackground';
import { AuthCard } from './AuthCard';

/** Общий fallback для Suspense на страницах входа/регистрации. */
export function AuthPageLoadingFallback() {
  return (
    <AuthBackground>
      <AuthCard>
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-ds-text-muted">
          <svg
            className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm">Загрузка…</span>
        </div>
      </AuthCard>
    </AuthBackground>
  );
}
