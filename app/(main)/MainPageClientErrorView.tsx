'use client';

import { useEffect } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

function reloadMainPageDocument() {
  window.location.reload();
}

export function MainPageClientErrorView({
  error,
  t,
  onRetry = reloadMainPageDocument,
}: {
  error: string;
  onRetry?: () => void;
  t: (key: string) => string;
}) {
  useEffect(() => {
    window.addEventListener('online', onRetry);
    return () => window.removeEventListener('online', onRetry);
  }, [onRetry]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 dark:bg-gray-900">
      <p className="text-center text-lg text-red-600 dark:text-red-400">
        {t('sprint.errors.loadFailedPrefix')} {error}
      </p>
      <p className="max-w-md text-center text-sm text-gray-600 dark:text-gray-400">
        {t('sprint.errors.retryHint')}
      </p>
      <Button type="button" variant="primary" onClick={onRetry}>
        <Icon className="h-4 w-4" name="refresh" />
        {t('sprint.errors.retry')}
      </Button>
    </div>
  );
}
