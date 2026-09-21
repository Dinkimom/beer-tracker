'use client';

import Link from 'next/link';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface PageHeaderAdminLinkProps {
  adminHref: string;
}

export function PageHeaderAdminLink({ adminHref }: PageHeaderAdminLinkProps) {
  const { t } = useI18n();
  return (
    <Link
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-800"
      href={adminHref}
    >
      <Icon className="h-4 w-4 shrink-0" name="wrench" />
      <span className="whitespace-nowrap">{t('header.admin')}</span>
    </Link>
  );
}
