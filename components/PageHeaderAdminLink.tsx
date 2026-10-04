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
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/[0.05] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-canvas dark:text-gray-200 dark:hover:bg-white/10 dark:focus-visible:ring-blue-400"
      href={adminHref}
    >
      <Icon className="h-4 w-4 shrink-0" name="wrench" />
      <span className="whitespace-nowrap">{t('header.admin')}</span>
    </Link>
  );
}
