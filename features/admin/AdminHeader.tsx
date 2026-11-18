'use client';

import Link from 'next/link';

import { BeerTrackerLogoButton } from '@/components/BeerTrackerLogoButton';
import { buttonClassName } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useI18n } from '@/contexts/LanguageContext';
import { AdminHeaderOrganizationTitle } from '@/features/admin/AdminHeaderOrganizationTitle';
import { useThemeStorage } from '@/hooks/useLocalStorage';

interface AdminHeaderProps {
  canAdmin: boolean;
  organizationName: string | null;
}

export function AdminHeader({ canAdmin, organizationName }: AdminHeaderProps) {
  const { t } = useI18n();
  const [theme, setTheme] = useThemeStorage();

  return (
    <header className="flex-shrink-0 border-b border-ds-border-subtle bg-ds-surface-header">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BeerTrackerLogoButton label={t('admin.header.brandTitle')} />

          <div className="h-6 w-px flex-shrink-0 bg-ds-border-subtle" />

          <AdminHeaderOrganizationTitle
            canAdmin={canAdmin}
            fallbackTitle={t('admin.header.fallbackTitle')}
            organizationName={organizationName}
          />
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <HeaderIconButton
            title={
              theme === 'light' ? t('header.actions.switchToDarkTheme') : t('header.actions.switchToLightTheme')
            }
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? (
              <Icon className="h-4 w-4 text-amber-500" name="sun" />
            ) : (
              <Icon className="h-4 w-4 text-amber-400" name="moon" />
            )}
          </HeaderIconButton>

          <Link
            className={buttonClassName({ className: 'h-8 shrink-0', size: 'sm', variant: 'outline' })}
            href="/"
          >
            <span className="whitespace-nowrap">{t('admin.header.toPlanner')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
