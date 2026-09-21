'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { getAppVersionLabel } from '@/lib/appVersion';

interface AppVersionLabelProps {
  className?: string;
}

export function AppVersionLabel({ className }: AppVersionLabelProps) {
  const { t } = useI18n();
  const version = getAppVersionLabel();
  const label = t('common.appVersionTitle', { version });

  return (
    <span
      aria-label={label}
      className={`font-mono tabular-nums text-ds-text-muted ${className ?? ''}`}
      title={label}
    >
      {version}
    </span>
  );
}
