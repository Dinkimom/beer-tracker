'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { getAppVersionLabel } from '@/lib/appVersion';

interface AppVersionLabelProps {
  className?: string;
  /** Родительская кнопка уже задаёт доступное имя. */
  embedded?: boolean;
}

export function AppVersionLabel({ className, embedded = false }: AppVersionLabelProps) {
  const { t } = useI18n();
  const version = getAppVersionLabel();

  return (
    <span
      aria-hidden={embedded ? true : undefined}
      aria-label={embedded ? undefined : t('common.appVersionTitle', { version })}
      className={`font-mono tabular-nums text-ds-text-muted ${className ?? ''}`}
    >
      {version}
    </span>
  );
}
