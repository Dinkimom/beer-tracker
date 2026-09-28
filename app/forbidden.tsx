'use client';

import Link from 'next/link';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

export default function Forbidden() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-6 dark:bg-background">
      <p className="text-sm font-semibold tracking-wide text-amber-700 dark:text-amber-400">
        {t('errors.forbiddenCode')}
      </p>
      <Icon aria-hidden className="h-14 w-14 text-amber-600 dark:text-amber-400" name="lock" />
      <h1 className="text-center text-xl font-semibold text-gray-900 dark:text-gray-100">
        {t('errors.forbiddenTitle')}
      </h1>
      <p className="max-w-md text-center text-base text-gray-700 dark:text-gray-300">
        {t('errors.forbiddenBody')}
      </p>
      <Link
        className="mt-2 inline-flex h-10 cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/80 dark:focus-visible:ring-offset-gray-900"
        href="/"
      >
        {t('errors.goHome')}
      </Link>
    </div>
  );
}
