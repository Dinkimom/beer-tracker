'use client';

import { Icon } from '@/components/Icon';

export function MainPageClientAccessDeniedView({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 dark:bg-gray-900">
      <Icon aria-hidden className="h-14 w-14 text-amber-600 dark:text-amber-400" name="lock" />
      <p className="max-w-md text-center text-lg text-gray-800 dark:text-gray-200">
        {t('sprint.access.plannerDenied')}
      </p>
    </div>
  );
}
