'use client';

import type { ReactNode } from 'react';

import { OtorvaCredentialsFields } from '@/components/OtorvaCredentialsFields';

/** Встроенный трекер: email и пароль вместо вставки токена (обмен — при отправке формы). */
export function AuthSetupOtorvaSection({ error, isLoading }: { error: string; isLoading: boolean }): ReactNode {
  return (
    <>
      <OtorvaCredentialsFields disabled={isLoading} idPrefix="auth" />
      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </>
  );
}
