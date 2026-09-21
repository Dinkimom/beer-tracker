'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallSection() {
  const { t } = useI18n();
  const { mode, promptInstall } = usePwaInstall();

  const hintByMode = {
    ios: t('settings.generalTab.pwa.iosHint'),
    manual: t('settings.generalTab.pwa.manualHint'),
    prompt: t('settings.generalTab.pwa.installHint'),
    standalone: t('settings.generalTab.pwa.installedHint'),
  } as const;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.generalTab.pwa.label')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
          {hintByMode[mode]}
        </p>
      </div>
      {mode === 'prompt' ? (
        <Button className="shrink-0" variant="outline" onClick={() => void promptInstall()}>
          {t('settings.generalTab.pwa.installButton')}
        </Button>
      ) : null}
    </div>
  );
}
